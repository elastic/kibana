/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import type { Logger, RequestHandler } from '@kbn/core/server';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import type { IlmPolicyStatusResponse } from '@kbn/reporting-common/types';
import { REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY } from '@kbn/reporting-server';
import type { ReportingCore } from '../../../core';
import { IlmPolicyManager } from '../../../lib';
import { getCounters } from '../../common';

const getAuthzWrapper =
  (reporting: ReportingCore, logger: Logger) =>
  <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> => {
    return async (ctx, req, res) => {
      const { security } = reporting.getPluginSetupDeps();
      if (!security?.license.isEnabled()) {
        return handler(ctx, req, res);
      }

      const { elasticsearch } = await ctx.core;

      try {
        const body = await elasticsearch.client.asCurrentUser.security.hasPrivileges({
          body: {
            index: [
              {
                privileges: ['manage'], // required to do anything with the reporting indices
                names: [REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY],
                allow_restricted_indices: true,
              },
            ],
          },
        });

        if (!body.has_all_requested) {
          const responseString = JSON.stringify(body);
          logger.debug(
            `Current user does not have manage privilege for Reporting indices: ${responseString}`
          );
          return res.forbidden({
            body: `The current user requires "manage" privilege on the "${REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY}" indices.`,
          });
        }
      } catch (e) {
        logger.error(e);
        return res.customError({ statusCode: e.statusCode, body: e.message });
      }

      return handler(ctx, req, res);
    };
  };

export const registerDeprecationsRoutes = (reporting: ReportingCore, logger: Logger) => {
  const { router } = reporting.getPluginSetupDeps();
  const authzWrapper = getAuthzWrapper(reporting, logger);

  const getStatusPath = INTERNAL_ROUTES.MIGRATE.GET_ILM_POLICY_STATUS;
  router.get(
    {
      path: getStatusPath,
      validate: false,
      options: { access: 'internal' },
    },
    authzWrapper(async ({ core }, req, res) => {
      const counters = getCounters(req.route.method, getStatusPath, reporting.getUsageCounter());

      const checkIlmMigrationStatus = async () => {
        const { client: scopedClient } = (await core).elasticsearch;

        const ilmPolicyManager = IlmPolicyManager.create({ client: scopedClient.asInternalUser });
        return ilmPolicyManager.checkIlmMigrationStatus();
      };

      try {
        const response: IlmPolicyStatusResponse = {
          status: await checkIlmMigrationStatus(),
        };

        counters.usageCounter();

        return res.ok({ body: response });
      } catch (e) {
        logger.error(e);
        const statusCode = e?.statusCode ?? 500;
        counters.errorCounter(statusCode);
        return res.customError({
          body: { message: e.message },
          statusCode,
        });
      }
    })
  );

  const migrateApiPath = INTERNAL_ROUTES.MIGRATE.MIGRATE_ILM_POLICY;
  router.put(
    {
      path: migrateApiPath,
      validate: false,
      options: { access: 'internal' },
    },
    authzWrapper(async ({ core }, req, res) => {
      const counters = getCounters(req.route.method, migrateApiPath, reporting.getUsageCounter());

      // First we ensure that the reporting ILM policy exists in the cluster
      try {
        const {
          client: { asCurrentUser },
        } = (await core).elasticsearch;
        const scopedIlmPolicyManager = IlmPolicyManager.create({
          client: asCurrentUser,
        });

        // We don't want to overwrite an existing reporting policy because it may contain alterations made by users
        if (!(await scopedIlmPolicyManager.doesIlmPolicyExist())) {
          await scopedIlmPolicyManager.createIlmPolicy();
        }
      } catch (e) {
        return res.customError({ statusCode: e?.statusCode ?? 500, body: { message: e.message } });
      }

      // Second we migrate all of the existing indices to be managed by the reporting ILM policy
      try {
        const {
          client: { asInternalUser },
        } = (await core).elasticsearch;
        const unscopedIlmPolicyManager = IlmPolicyManager.create({
          client: asInternalUser,
        });
        const response = await unscopedIlmPolicyManager.migrateIndicesToIlmPolicy();

        counters.usageCounter();

        return res.ok({ body: response });
      } catch (err) {
        logger.error(err);

        if (err instanceof errors.ResponseError) {
          // If there were no reporting indices to update, that's OK because then there is nothing to migrate
          if (err.statusCode === 404) {
            counters.errorCounter(undefined, 404);
            return res.ok();
          }

          const statusCode = err.statusCode ?? 500;
          counters.errorCounter(undefined, statusCode);
          return res.customError({
            body: {
              message: err.message,
              name: err.name,
            },
            statusCode,
          });
        }

        throw err;
      }
    })
  );
};
