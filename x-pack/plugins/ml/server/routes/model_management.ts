/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteInitialization } from '../types';
import { wrapError } from '../client/error_wrapper';

import { MemoryUsageService } from '../models/model_management';
import { itemTypeLiterals } from './schemas/saved_objects';

export function modelManagementRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup ModelManagement
   *
   * @api {get} /api/ml/model_management/nodes_overview Get node overview about the models allocation
   * @apiName GetModelManagementNodesOverview
   * @apiDescription Retrieves the list of ML nodes with memory breakdown and allocated models info
   */
  router.get(
    {
      path: '/api/ml/model_management/nodes_overview',
      validate: {},
      options: {
        tags: [
          'access:ml:canViewMlNodes',
          'access:ml:canGetDataFrameAnalytics',
          'access:ml:canGetJobs',
          'access:ml:canGetTrainedModels',
        ],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, response }) => {
      try {
        const memoryUsageService = new MemoryUsageService(mlClient);
        const result = await memoryUsageService.getNodesOverview();
        return response.ok({
          body: result,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup ModelManagement
   *
   * @api {get} /api/ml/model_management/memory_usage Memory usage for jobs and trained models
   * @apiName GetModelManagementMemoryUsage
   * @apiDescription Returns the memory usage for jobs and trained models
   */
  router.get(
    {
      path: '/api/ml/model_management/memory_usage',
      validate: {
        query: schema.object({
          type: schema.maybe(itemTypeLiterals),
          node: schema.maybe(schema.string()),
          showClosedJobs: schema.maybe(schema.boolean()),
        }),
      },
      options: {
        tags: [
          'access:ml:canViewMlNodes',
          'access:ml:canGetDataFrameAnalytics',
          'access:ml:canGetJobs',
          'access:ml:canGetTrainedModels',
        ],
      },
    },

    routeGuard.fullLicenseAPIGuard(async ({ mlClient, response, request }) => {
      try {
        const memoryUsageService = new MemoryUsageService(mlClient);
        return response.ok({
          body: await memoryUsageService.getMemorySizes(
            request.query.type,
            request.query.node,
            request.query.showClosedJobs
          ),
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
