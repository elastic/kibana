/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_EXTERNAL_BASE_PATH, ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import type { RouteInitialization, SavedObjectsRouteDeps } from '../types';
import { checksFactory, syncSavedObjectsFactory } from '../saved_objects';
import {
  updateJobsSpaces,
  updateTrainedModelsSpaces,
  itemsAndCurrentSpace,
  syncJobObjects,
  syncCheckSchema,
  canDeleteMLSpaceAwareItemsSchema,
  itemTypeSchema,
} from './schemas/saved_objects';
import { spacesUtilsProvider } from '../lib/spaces_utils';
import type { MlSavedObjectType } from '../../common/types/saved_objects';

/**
 * Routes for job saved object management
 */
export function savedObjectsRoutes(
  { router, routeGuard }: RouteInitialization,
  { getSpaces, resolveMlCapabilities }: SavedObjectsRouteDeps
) {
  /**
   * @apiGroup MLSavedObjects
   *
   * @api {get} /internal/ml/saved_objects/status Get job and trained model saved object status
   * @apiName SavedObjectsStatus
   * @apiDescription Lists all jobs, trained models and saved objects to view the relationship status between them
   *
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/status`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs', 'access:ml:canGetTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, response, mlSavedObjectService }) => {
        try {
          const { checkStatus } = checksFactory(client, mlSavedObjectService);
          const status = await checkStatus();

          return response.ok({
            body: status,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup MLSavedObjects
   *
   * @api {get} /api/ml/saved_objects/sync Sync job and trained models saved objects
   * @apiName SyncMLSavedObjects
   * @apiDescription Synchronizes saved objects for jobs and trained models. Saved objects will be created for items which are missing them,
   *                 and saved objects will be deleted for items which no longer exist.
   *                 Updates missing datafeed IDs in saved objects for datafeeds which exist, and
   *                 removes datafeed IDs for datafeeds which no longer exist.
   *
   */
  router.versioned
    .get({
      path: `${ML_EXTERNAL_BASE_PATH}/saved_objects/sync`,
      access: 'public',
      summary: 'Synchronize machine learning saved objects',
      options: {
        tags: [
          'access:ml:canCreateJob',
          'access:ml:canCreateDataFrameAnalytics',
          'access:ml:canCreateTrainedModels',
          'oas-tag:machine learning',
        ],
      },
      description:
        'Synchronizes Kibana saved objects for machine learning jobs and trained models. This API runs automatically when you start Kibana and periodically thereafter.',
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: syncJobObjects,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, request, response, mlSavedObjectService }) => {
          try {
            const { simulate } = request.query;
            const { syncSavedObjects } = syncSavedObjectsFactory(client, mlSavedObjectService);
            const savedObjects = await syncSavedObjects(simulate);

            return response.ok({
              body: savedObjects,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );

  /**
   * @apiGroup MLSavedObjects
   *
   * @api {get} /internal/ml/saved_objects/initialize Create saved objects for all job and trained models
   * @apiName InitializeMLSavedObjects
   * @apiDescription Create saved objects for jobs and trained models which are missing them.
   *
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/initialize`,
      access: 'internal',
      options: {
        tags: [
          'access:ml:canCreateJob',
          'access:ml:canCreateDataFrameAnalytics',
          'access:ml:canCreateTrainedModels',
        ],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: syncJobObjects,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, request, response, mlSavedObjectService }) => {
          try {
            const { simulate } = request.query;
            const { initSavedObjects } = syncSavedObjectsFactory(client, mlSavedObjectService);
            const savedObjects = await initSavedObjects(simulate);

            return response.ok({
              body: savedObjects,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );

  /**
   * @apiGroup MLSavedObjects
   *
   * @api {get} /internal/ml/saved_objects/sync_needed Check whether job and trained model saved objects need synchronizing
   * @apiName SyncCheck
   * @apiDescription Check whether job and trained model saved objects need synchronizing.
   *
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/sync_check`,
      access: 'internal',
      options: {
        tags: [
          'access:ml:canGetJobs',
          'access:ml:canGetDataFrameAnalytics',
          'access:ml:canGetTrainedModels',
        ],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: syncCheckSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, request, response, mlSavedObjectService }) => {
          try {
            const { mlSavedObjectType } = request.body;
            const { isSyncNeeded } = syncSavedObjectsFactory(client, mlSavedObjectService);
            const result = await isSyncNeeded(mlSavedObjectType as MlSavedObjectType);

            return response.ok({
              body: { result },
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );

  /**
   * @apiGroup MLSavedObjects
   *
   * @api {post} /internal/ml/saved_objects/update_jobs_spaces Update what spaces jobs are assigned to
   * @apiName UpdateJobsSpaces
   * @apiDescription Update a list of jobs to add and/or remove them from given spaces.
   *
   * @apiSchema (body) updateJobsSpaces
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/update_jobs_spaces`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateJob', 'access:ml:canCreateDataFrameAnalytics'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: updateJobsSpaces,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ request, response, mlSavedObjectService }) => {
        try {
          const { jobType, jobIds, spacesToAdd, spacesToRemove } = request.body;

          const body = await mlSavedObjectService.updateJobsSpaces(
            jobType,
            jobIds,
            spacesToAdd,
            spacesToRemove
          );

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup MLSavedObjects
   *
   * @api {post} /internal/ml/saved_objects/update_trained_models_spaces Update what spaces trained models are assigned to
   * @apiName UpdateTrainedModelsSpaces
   * @apiDescription Update a list of trained models to add and/or remove them from given spaces.
   *
   * @apiSchema (body) updateTrainedModelsSpaces
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/update_trained_models_spaces`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: updateTrainedModelsSpaces,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ request, response, mlSavedObjectService }) => {
        try {
          const { modelIds, spacesToAdd, spacesToRemove } = request.body;

          const body = await mlSavedObjectService.updateTrainedModelsSpaces(
            modelIds,
            spacesToAdd,
            spacesToRemove
          );

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup MLSavedObjects
   *
   * @api {post} /internal/ml/saved_objects/remove_item_from_current_space Remove jobs or trained models from the current space
   * @apiName RemoveMLSpaceAwareItemsFromCurrentSpace
   * @apiDescription Remove a list of jobs or trained models from the current space.
   *
   * @apiSchema (body) itemsAndCurrentSpace
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/remove_item_from_current_space`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateJob', 'access:ml:canCreateDataFrameAnalytics'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: itemsAndCurrentSpace,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ request, response, mlSavedObjectService }) => {
        try {
          const { mlSavedObjectType, ids } = request.body;
          const { getCurrentSpaceId } = spacesUtilsProvider(getSpaces, request);

          const currentSpaceId = await getCurrentSpaceId();
          if (currentSpaceId === null) {
            return response.ok({
              body: ids.map((id) => ({
                [id]: {
                  success: false,
                  error: 'Cannot remove current space. Spaces plugin is disabled.',
                },
              })),
            });
          }

          if (mlSavedObjectType === 'trained-model') {
            const body = await mlSavedObjectService.updateTrainedModelsSpaces(
              ids,
              [], // spacesToAdd
              [currentSpaceId] // spacesToRemove
            );

            return response.ok({
              body,
            });
          }

          const body = await mlSavedObjectService.updateJobsSpaces(
            mlSavedObjectType,
            ids,
            [], // spacesToAdd
            [currentSpaceId] // spacesToRemove
          );

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup MLSavedObjects
   *
   * @api {get} /internal/ml/saved_objects/jobs_spaces Get all jobs and their spaces
   * @apiName JobsSpaces
   * @apiDescription List all jobs and their spaces.
   *
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/jobs_spaces`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs', 'access:ml:canGetDataFrameAnalytics'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ response, mlSavedObjectService, client }) => {
        try {
          const { jobsSpaces } = checksFactory(client, mlSavedObjectService);
          const jobsStatus = await jobsSpaces();

          return response.ok({
            body: jobsStatus,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup MLSavedObjects
   *
   * @api {get} /internal/ml/saved_objects/trained_models_spaces Get all trained models and their spaces
   * @apiName TrainedModelsSpaces
   * @apiDescription List all trained models and their spaces.
   *
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/trained_models_spaces`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetTrainedModels'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ response, mlSavedObjectService, client }) => {
        try {
          const { trainedModelsSpaces } = checksFactory(client, mlSavedObjectService);
          const modelStatus = await trainedModelsSpaces();

          return response.ok({
            body: modelStatus,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup MLSavedObjects
   *
   * @api {post} /internal/ml/saved_objects/can_delete_ml_space_aware_item Check whether user can delete a job or trained model
   * @apiName CanDeleteMLSpaceAwareItems
   * @apiDescription Check the user's ability to delete jobs or trained models. Returns whether they are able
   *                 to fully delete the job or trained model and whether they are able to remove it from
   *                 the current space.
   *                 Note, this is only for enabling UI controls. A user calling endpoints
   *                 directly will still be able to delete or remove the job or trained model from a space.
   *
   * @apiSchema (params) itemTypeSchema
   * @apiSchema (body) canDeleteMLSpaceAwareItemsSchema
   * @apiSuccessExample {json} Error-Response:
   * {
   *   "my_job": {
   *     "canDelete": false,
   *     "canRemoveFromSpace": true
   *   }
   * }
   *
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/can_delete_ml_space_aware_item/{jobType}`,
      access: 'internal',
      options: {
        tags: [
          'access:ml:canGetJobs',
          'access:ml:canGetDataFrameAnalytics',
          'access:ml:canGetTrainedModels',
        ],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: itemTypeSchema,
            body: canDeleteMLSpaceAwareItemsSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ request, response, mlSavedObjectService, client }) => {
          try {
            const { jobType } = request.params;
            const { ids } = request.body;

            const { canDeleteMLSpaceAwareItems } = checksFactory(client, mlSavedObjectService);
            const body = await canDeleteMLSpaceAwareItems(
              request,
              jobType,
              ids,
              getSpaces !== undefined,
              resolveMlCapabilities
            );

            return response.ok({
              body,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );
}
