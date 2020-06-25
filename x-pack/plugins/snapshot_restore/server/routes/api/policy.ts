/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

import { SlmPolicyEs, PolicyIndicesResponse } from '../../../common/types';
import { deserializePolicy, serializePolicy } from '../../../common/lib';
import { getManagedPolicyNames } from '../../lib';
import { RouteDependencies, ResolveIndexResponseFromES } from '../../types';
import { addBasePath } from '../helpers';
import { nameParameterSchema, policySchema } from './validate_schemas';

export function registerPolicyRoutes({
  router,
  license,
  lib: { isEsError, wrapEsError },
}: RouteDependencies) {
  // GET all policies
  router.get(
    { path: addBasePath('policies'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;

      const managedPolicies = await getManagedPolicyNames(callAsCurrentUser);

      try {
        // Get policies
        const policiesByName: {
          [key: string]: SlmPolicyEs;
        } = await callAsCurrentUser('sr.policies', {
          human: true,
        });

        // Deserialize policies
        return res.ok({
          body: {
            policies: Object.entries(policiesByName).map(([name, policy]) => {
              return deserializePolicy(name, policy, managedPolicies);
            }),
          },
        });
      } catch (e) {
        if (isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );

  // GET one policy
  router.get(
    { path: addBasePath('policy/{name}'), validate: { params: nameParameterSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { name } = req.params as TypeOf<typeof nameParameterSchema>;

      try {
        const policiesByName: {
          [key: string]: SlmPolicyEs;
        } = await callAsCurrentUser('sr.policy', {
          name,
          human: true,
        });

        if (!policiesByName[name]) {
          // If policy doesn't exist, ES will return 200 with an empty object, so manually throw 404 here
          return res.notFound({ body: 'Policy not found' });
        }

        const managedPolicies = await getManagedPolicyNames(callAsCurrentUser);

        // Deserialize policy
        return res.ok({
          body: {
            policy: deserializePolicy(name, policiesByName[name], managedPolicies),
          },
        });
      } catch (e) {
        if (isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );

  // Create policy
  router.post(
    { path: addBasePath('policies'), validate: { body: policySchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const policy = req.body as TypeOf<typeof policySchema>;
      const { name } = policy;

      try {
        // Check that policy with the same name doesn't already exist
        const policyByName = await callAsCurrentUser('sr.policy', { name });
        if (policyByName[name]) {
          return res.conflict({ body: 'There is already a policy with that name.' });
        }
      } catch (e) {
        // Silently swallow errors
      }

      try {
        // Otherwise create new policy
        const response = await callAsCurrentUser('sr.updatePolicy', {
          name,
          body: serializePolicy(policy),
        });

        return res.ok({ body: response });
      } catch (e) {
        if (isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );

  // Update policy
  router.put(
    {
      path: addBasePath('policies/{name}'),
      validate: { params: nameParameterSchema, body: policySchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { name } = req.params as TypeOf<typeof nameParameterSchema>;
      const policy = req.body as TypeOf<typeof policySchema>;

      try {
        // Check that policy with the given name exists
        // If it doesn't exist, 404 will be thrown by ES and will be returned
        await callAsCurrentUser('sr.policy', { name });

        // Otherwise update policy
        const response = await callAsCurrentUser('sr.updatePolicy', {
          name,
          body: serializePolicy(policy),
        });

        return res.ok({ body: response });
      } catch (e) {
        if (isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );

  // Delete policy
  router.delete(
    { path: addBasePath('policies/{name}'), validate: { params: nameParameterSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { name } = req.params as TypeOf<typeof nameParameterSchema>;
      const policyNames = name.split(',');

      const response: { itemsDeleted: string[]; errors: any[] } = {
        itemsDeleted: [],
        errors: [],
      };

      await Promise.all(
        policyNames.map((policyName) => {
          return callAsCurrentUser('sr.deletePolicy', { name: policyName })
            .then(() => response.itemsDeleted.push(policyName))
            .catch((e) =>
              response.errors.push({
                name: policyName,
                error: wrapEsError(e),
              })
            );
        })
      );

      return res.ok({ body: response });
    })
  );

  // Execute policy
  router.post(
    { path: addBasePath('policy/{name}/run'), validate: { params: nameParameterSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { name } = req.params as TypeOf<typeof nameParameterSchema>;

      try {
        const { snapshot_name: snapshotName } = await callAsCurrentUser('sr.executePolicy', {
          name,
        });
        return res.ok({ body: { snapshotName } });
      } catch (e) {
        if (isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );

  // Get policy indices
  router.get(
    { path: addBasePath('policies/indices'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;

      try {
        const resolvedIndicesResponse: ResolveIndexResponseFromES = await callAsCurrentUser(
          'transport.request',
          {
            method: 'GET',
            path: `_resolve/index/*`,
            query: {
              expand_wildcards: 'all,hidden',
            },
          }
        );

        const body: PolicyIndicesResponse = {
          dataStreams: resolvedIndicesResponse.data_streams.map(({ name }) => name).sort(),
          indices: resolvedIndicesResponse.indices
            .flatMap((index) => (index.data_stream ? [] : index.name))
            .sort(),
        };

        return res.ok({
          body,
        });
      } catch (e) {
        if (isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );

  // Get retention settings
  router.get(
    { path: addBasePath('policies/retention_settings'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { persistent, transient, defaults } = await callAsCurrentUser('cluster.getSettings', {
        filterPath: '**.slm.retention*',
        includeDefaults: true,
      });
      const { slm: retentionSettings = undefined } = {
        ...defaults,
        ...persistent,
        ...transient,
      };

      const { retention_schedule: retentionSchedule } = retentionSettings;

      return res.ok({
        body: { retentionSchedule },
      });
    })
  );

  // Update retention settings
  const retentionSettingsSchema = schema.object({ retentionSchedule: schema.string() });

  router.put(
    {
      path: addBasePath('policies/retention_settings'),
      validate: { body: retentionSettingsSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { retentionSchedule } = req.body as TypeOf<typeof retentionSettingsSchema>;

      try {
        const response = await callAsCurrentUser('cluster.putSettings', {
          body: {
            persistent: {
              slm: {
                retention_schedule: retentionSchedule,
              },
            },
          },
        });

        return res.ok({ body: response });
      } catch (e) {
        if (isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );

  // Execute retention
  router.post(
    { path: addBasePath('policies/retention'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const response = await callAsCurrentUser('sr.executeRetention');
      return res.ok({ body: response });
    })
  );
}
