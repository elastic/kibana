/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import { mlLog } from '../lib/log';
import { capabilitiesProvider } from '../lib/capabilities';
import { spacesUtilsProvider } from '../lib/spaces_utils';
import type { RouteInitialization, SystemRouteDeps } from '../types';
import { getMlNodeCount } from '../lib/node_utils';

/**
 * System routes
 */
export function systemRoutes(
  { router, mlLicense, routeGuard }: RouteInitialization,
  { getSpaces, cloud, resolveMlCapabilities }: SystemRouteDeps
) {
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/_has_privileges`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetMlInfo'],
      },
      summary: 'Check privileges',
      description: 'Checks if the user has required privileges',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.maybe(schema.any()),
          },
        },
      },
      routeGuard.basicLicenseAPIGuard(async ({ mlClient, client, request, response }) => {
        try {
          const { asCurrentUser } = client;
          let upgradeInProgress = false;
          try {
            const body = await mlClient.info();
            // if ml indices are currently being migrated, upgrade_mode will be set to true
            // pass this back with the privileges to allow for the disabling of UI controls.
            upgradeInProgress = body.upgrade_mode === true;
          } catch (error) {
            // if the ml.info check fails, it could be due to the user having insufficient privileges
            // most likely they do not have the ml_user role and therefore will be blocked from using
            // ML at all. However, we need to catch this error so the privilege check doesn't fail.
            if (error.status === 403) {
              mlLog.info(
                'Unable to determine whether upgrade is being performed due to insufficient user privileges'
              );
            } else {
              mlLog.warn('Unable to determine whether upgrade is being performed');
            }
          }

          if (mlLicense.isSecurityEnabled() === false) {
            // if xpack.security.enabled has been explicitly set to false
            // return that security is disabled and don't call the privilegeCheck endpoint
            return response.ok({
              body: {
                upgradeInProgress,
              },
            });
          } else {
            const body = await asCurrentUser.security.hasPrivileges({ body: request.body });
            return response.ok({
              body: {
                hasPrivileges: body,
                upgradeInProgress,
              },
            });
          }
        } catch (error) {
          return response.customError(wrapError(error));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/ml_capabilities`,
      access: 'internal',
      summary: 'Check ML capabilities',
      description: 'Checks ML capabilities',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.basicLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { isMlEnabledInSpace } = spacesUtilsProvider(getSpaces, request);

          const mlCapabilities = await resolveMlCapabilities(request);
          if (mlCapabilities === null) {
            return response.customError(
              wrapError(new Error('resolveMlCapabilities is not defined'))
            );
          }

          const { getCapabilities } = capabilitiesProvider(
            mlClient,
            mlCapabilities,
            mlLicense,
            isMlEnabledInSpace
          );
          return response.ok({
            body: await getCapabilities(),
          });
        } catch (error) {
          return response.customError(wrapError(error));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/ml_node_count`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetMlInfo'],
      },
      summary: 'Get the number of ML nodes',
      description: 'Returns the number of ML nodes',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.basicLicenseAPIGuard(async ({ client, response }) => {
        try {
          return response.ok({
            body: await getMlNodeCount(client),
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/info`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetMlInfo'],
      },
      summary: 'Get ML info',
      description: 'Returns defaults and limits used by machine learning',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.basicLicenseAPIGuard(async ({ mlClient, response, client }) => {
        try {
          const body = await mlClient.info();
          const cloudId = cloud?.cloudId;
          const isCloudTrial = cloud?.trialEndDate && Date.now() < cloud.trialEndDate.getTime();

          let isMlAutoscalingEnabled = false;
          try {
            await client.asInternalUser.autoscaling.getAutoscalingPolicy({ name: 'ml' });
            isMlAutoscalingEnabled = true;
          } catch (e) {
            // If doesn't exist, then keep the false
          }

          return response.ok({
            body: {
              ...body,
              cloudId,
              isCloudTrial,
              cloudUrl: cloud.baseUrl,
              isMlAutoscalingEnabled,
            },
          });
        } catch (error) {
          return response.customError(wrapError(error));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/es_search`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
      deprecated: true,
      summary: 'ES Search wrapper',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.maybe(schema.any()),
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
        try {
          const body = await client.asCurrentUser.search(request.body);
          return response.ok({
            body,
          });
        } catch (error) {
          return response.customError(wrapError(error));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/index_exists`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetFieldInfo'],
      },
      summary: 'ES Field caps wrapper checks if index exists',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: schema.object({ indices: schema.arrayOf(schema.string()) }) },
        },
      },
      routeGuard.basicLicenseAPIGuard(async ({ client, request, response }) => {
        try {
          const { indices } = request.body;

          const results = await Promise.all(
            indices.map(async (index) =>
              client.asCurrentUser.indices.exists({
                index,
                allow_no_indices: false,
              })
            )
          );

          const result = indices.reduce((acc, cur, i) => {
            acc[cur] = { exists: results[i] };
            return acc;
          }, {} as Record<string, { exists: boolean }>);

          return response.ok({
            body: result,
          });
        } catch (error) {
          return response.customError(wrapError(error));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/reindex_with_pipeline`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateTrainedModels'],
      },
      summary: 'ES reindex wrapper to reindex with pipeline',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.any(),
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
        const reindexRequest = {
          body: request.body,
          // Create a task and return task id instead of blocking until complete
          wait_for_completion: false,
        } as estypes.ReindexRequest;
        try {
          const result = await client.asCurrentUser.reindex(reindexRequest);

          return response.ok({
            body: result,
          });
        } catch (error) {
          return response.customError(wrapError(error));
        }
      })
    );
}
