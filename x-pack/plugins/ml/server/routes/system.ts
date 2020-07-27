/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { Request } from 'hapi';
import { RequestHandlerContext } from 'kibana/server';
import { wrapError } from '../client/error_wrapper';
import { mlLog } from '../client/log';
import { capabilitiesProvider } from '../lib/capabilities';
import { spacesUtilsProvider } from '../lib/spaces_utils';
import { RouteInitialization, SystemRouteDeps } from '../types';

/**
 * System routes
 */
export function systemRoutes(
  { router, mlLicense }: RouteInitialization,
  { spaces, cloud, resolveMlCapabilities }: SystemRouteDeps
) {
  async function getNodeCount(context: RequestHandlerContext) {
    const filterPath = 'nodes.*.attributes';
    const resp = await context.ml!.mlClient.callAsInternalUser('nodes.info', {
      filterPath,
    });

    let count = 0;
    if (typeof resp.nodes === 'object') {
      Object.keys(resp.nodes).forEach((k) => {
        if (resp.nodes[k].attributes !== undefined) {
          const maxOpenJobs = resp.nodes[k].attributes['ml.max_open_jobs'];
          if (maxOpenJobs !== null && maxOpenJobs > 0) {
            count++;
          }
        }
      });
    }
    return { count };
  }

  /**
   * @apiGroup SystemRoutes
   *
   * @api {post} /api/ml/_has_privileges Check privileges
   * @apiName HasPrivileges
   * @apiDescription Checks if the user has required privileges
   */
  router.post(
    {
      path: '/api/ml/_has_privileges',
      validate: {
        body: schema.maybe(schema.any()),
      },
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    mlLicense.basicLicenseAPIGuard(async (context, request, response) => {
      try {
        const { callAsCurrentUser, callAsInternalUser } = context.ml!.mlClient;
        let upgradeInProgress = false;
        try {
          const info = await callAsInternalUser('ml.info');
          // if ml indices are currently being migrated, upgrade_mode will be set to true
          // pass this back with the privileges to allow for the disabling of UI controls.
          upgradeInProgress = info.upgrade_mode === true;
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
              securityDisabled: true,
              upgradeInProgress,
            },
          });
        } else {
          const body = request.body;
          const resp = await callAsCurrentUser('ml.privilegeCheck', { body });
          resp.upgradeInProgress = upgradeInProgress;
          return response.ok({
            body: resp,
          });
        }
      } catch (error) {
        return response.customError(wrapError(error));
      }
    })
  );

  /**
   * @apiGroup SystemRoutes
   *
   * @api {get} /api/ml/ml_capabilities Check ML capabilities
   * @apiName MlCapabilitiesResponse
   * @apiDescription Checks ML capabilities
   */
  router.get(
    {
      path: '/api/ml/ml_capabilities',
      validate: false,
    },
    mlLicense.basicLicenseAPIGuard(async (context, request, response) => {
      try {
        // if spaces is disabled force isMlEnabledInSpace to be true
        const { isMlEnabledInSpace } =
          spaces !== undefined
            ? spacesUtilsProvider(spaces, (request as unknown) as Request)
            : { isMlEnabledInSpace: async () => true };

        const mlCapabilities = await resolveMlCapabilities(request);
        if (mlCapabilities === null) {
          return response.customError(wrapError(new Error('resolveMlCapabilities is not defined')));
        }

        const { getCapabilities } = capabilitiesProvider(
          context.ml!.mlClient,
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

  /**
   * @apiGroup SystemRoutes
   *
   * @api {get} /api/ml/ml_node_count Get the amount of ML nodes
   * @apiName MlNodeCount
   * @apiDescription Returns the amount of ML nodes.
   */
  router.get(
    {
      path: '/api/ml/ml_node_count',
      validate: false,
      options: {
        tags: ['access:ml:canGetJobs', 'access:ml:canGetDatafeeds'],
      },
    },

    mlLicense.basicLicenseAPIGuard(async (context, request, response) => {
      try {
        return response.ok({
          body: await getNodeCount(context),
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup SystemRoutes
   *
   * @api {get} /api/ml/info Get ML info
   * @apiName MlInfo
   * @apiDescription Returns defaults and limits used by machine learning.
   */
  router.get(
    {
      path: '/api/ml/info',
      validate: false,
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    mlLicense.basicLicenseAPIGuard(async (context, request, response) => {
      try {
        const info = await context.ml!.mlClient.callAsInternalUser('ml.info');
        const cloudId = cloud && cloud.cloudId;
        return response.ok({
          body: { ...info, cloudId },
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    })
  );

  /**
   * @apiGroup SystemRoutes
   *
   * @apiDeprecated
   *
   * @api {post} /api/ml/es_search ES Search wrapper
   * @apiName MlEsSearch
   */
  router.post(
    {
      path: '/api/ml/es_search',
      validate: {
        body: schema.maybe(schema.any()),
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        return response.ok({
          body: await context.ml!.mlClient.callAsCurrentUser('search', request.body),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    })
  );

  /**
   * @apiGroup SystemRoutes
   *
   * @api {post} /api/ml/index_exists ES Field caps wrapper checks if index exists
   * @apiName MlIndexExists
   */
  router.post(
    {
      path: '/api/ml/index_exists',
      validate: {
        body: schema.object({ index: schema.string() }),
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { index } = request.body;

        const options = {
          index: [index],
          fields: ['*'],
          ignoreUnavailable: true,
          allowNoIndices: true,
          ignore: 404,
        };

        const fieldsResult = await context.ml!.mlClient.callAsCurrentUser('fieldCaps', options);
        const result = { exists: false };

        if (Array.isArray(fieldsResult.indices) && fieldsResult.indices.length !== 0) {
          result.exists = true;
        }

        return response.ok({
          body: result,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    })
  );
}
