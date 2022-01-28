/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapError } from '../client/error_wrapper';
import { RouteInitialization, SavedObjectsRouteDeps } from '../types';
import { checksFactory, syncSavedObjectsFactory, JobSavedObjectStatus } from '../saved_objects';
import {
  updateJobsSpaces,
  updateModelsSpaces,
  jobsAndCurrentSpace,
  syncJobObjects,
  syncCheckSchema,
  canDeleteJobSchema,
  jobTypeSchema,
} from './schemas/saved_objects';
import { spacesUtilsProvider } from '../lib/spaces_utils';
import { JobType } from '../../common/types/saved_objects';

/**
 * Routes for job saved object management
 */
export function savedObjectsRoutes(
  { router, routeGuard }: RouteInitialization,
  { getSpaces, resolveMlCapabilities }: SavedObjectsRouteDeps
) {
  /**
   * @apiGroup JobSavedObjects
   *
   * @api {get} /api/ml/saved_objects/status Get job saved object status
   * @apiName SavedObjectsStatus
   * @apiDescription Lists all jobs and saved objects to view the relationship status between them
   *
   */
  router.get(
    {
      path: '/api/ml/saved_objects/status',
      validate: false,
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, response, jobSavedObjectService }) => {
      try {
        const { checkStatus } = checksFactory(client, jobSavedObjectService);
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
   * @apiGroup JobSavedObjects
   *
   * @api {get} /api/ml/saved_objects/sync Sync job saved objects
   * @apiName SyncJobSavedObjects
   * @apiDescription Synchronizes saved objects for jobs. Saved objects will be created for jobs which are missing them,
   *                 and saved objects will be deleted for jobs which no longer exist.
   *                 Updates missing datafeed IDs in saved objects for datafeeds which exist, and
   *                 removes datafeed IDs for datafeeds which no longer exist.
   *
   */
  router.get(
    {
      path: '/api/ml/saved_objects/sync',
      validate: {
        query: syncJobObjects,
      },
      options: {
        tags: ['access:ml:canCreateJob', 'access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response, jobSavedObjectService }) => {
      try {
        const { simulate } = request.query;
        const { syncSavedObjects } = syncSavedObjectsFactory(client, jobSavedObjectService);
        const savedObjects = await syncSavedObjects(simulate);

        return response.ok({
          body: savedObjects,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobSavedObjects
   *
   * @api {get} /api/ml/saved_objects/initialize Create job saved objects for all jobs
   * @apiName InitializeJobSavedObjects
   * @apiDescription Create saved objects for jobs which are missing them.
   *
   */
  router.get(
    {
      path: '/api/ml/saved_objects/initialize',
      validate: {
        query: syncJobObjects,
      },
      options: {
        tags: ['access:ml:canCreateJob', 'access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response, jobSavedObjectService }) => {
      try {
        const { simulate } = request.query;
        const { initSavedObjects } = syncSavedObjectsFactory(client, jobSavedObjectService);
        const savedObjects = await initSavedObjects(simulate);

        return response.ok({
          body: savedObjects,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobSavedObjects
   *
   * @api {get} /api/ml/saved_objects/sync_needed Check whether job saved objects need synchronizing
   * @apiName SyncCheck
   * @apiDescription Check whether job saved objects need synchronizing.
   *
   */
  router.post(
    {
      path: '/api/ml/saved_objects/sync_check',
      validate: {
        body: syncCheckSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs', 'access:ml:canGetDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response, jobSavedObjectService }) => {
      try {
        const { jobType } = request.body;
        const { isSyncNeeded } = syncSavedObjectsFactory(client, jobSavedObjectService);
        const result = await isSyncNeeded(jobType as JobType);

        return response.ok({
          body: { result },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobSavedObjects
   *
   * @api {post} /api/ml/saved_objects/update_jobs_spaces Update what spaces jobs are assigned to
   * @apiName UpdateJobsSpaces
   * @apiDescription Update a list of jobs to add and/or remove them from given spaces
   *
   * @apiSchema (body) updateJobsSpaces
   */
  router.post(
    {
      path: '/api/ml/saved_objects/update_jobs_spaces',
      validate: {
        body: updateJobsSpaces,
      },
      options: {
        tags: ['access:ml:canCreateJob', 'access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ request, response, jobSavedObjectService }) => {
      try {
        const { jobType, jobIds, spacesToAdd, spacesToRemove } = request.body;

        const body = await jobSavedObjectService.updateJobsSpaces(
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
   * @apiGroup JobSavedObjects
   *
   * @api {post} /api/ml/saved_objects/update_models_spaces Update what spaces jobs are assigned to
   * @apiName UpdateModelsSpaces
   * @apiDescription Update a list of models to add and/or remove them from given spaces
   *
   * @apiSchema (body) updateModelsSpaces
   */
  router.post(
    {
      path: '/api/ml/saved_objects/update_models_spaces',
      validate: {
        body: updateModelsSpaces,
      },
      options: {
        tags: ['access:ml:canCreateJob', 'access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ request, response, jobSavedObjectService }) => {
      try {
        const { modelIds, spacesToAdd, spacesToRemove } = request.body;

        const body = await jobSavedObjectService.updateModelsSpaces(
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
   * @apiGroup JobSavedObjects
   *
   * @api {post} /api/ml/saved_objects/remove_job_from_current_space Remove jobs from the current space
   * @apiName RemoveJobsFromCurrentSpace
   * @apiDescription Remove a list of jobs from the current space
   *
   * @apiSchema (body) jobsAndCurrentSpace
   */
  router.post(
    {
      path: '/api/ml/saved_objects/remove_job_from_current_space',
      validate: {
        body: jobsAndCurrentSpace,
      },
      options: {
        tags: ['access:ml:canCreateJob', 'access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ request, response, jobSavedObjectService }) => {
      try {
        const { jobType, jobIds } = request.body;
        const { getCurrentSpaceId } = spacesUtilsProvider(getSpaces, request);

        const currentSpaceId = await getCurrentSpaceId();
        if (currentSpaceId === null) {
          return response.ok({
            body: jobIds.map((id) => ({
              [id]: {
                success: false,
                error: 'Cannot remove current space. Spaces plugin is disabled.',
              },
            })),
          });
        }

        const body = await jobSavedObjectService.updateJobsSpaces(
          jobType,
          jobIds,
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
   * @apiGroup JobSavedObjects
   *
   * @api {get} /api/ml/saved_objects/jobs_spaces Get all jobs and their spaces
   * @apiName JobsSpaces
   * @apiDescription List all jobs and their spaces.
   *
   */
  router.get(
    {
      path: '/api/ml/saved_objects/jobs_spaces',
      validate: false,
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ response, jobSavedObjectService, client }) => {
      try {
        const { checkStatus } = checksFactory(client, jobSavedObjectService);
        const savedObjects = (await checkStatus()).savedObjects;
        const jobStatus = (
          Object.entries(savedObjects)
            .filter(([type]) => type === 'anomaly-detector' || type === 'data-frame-analytics')
            .map(([, status]) => status)
            .flat() as JobSavedObjectStatus[]
        )
          .filter((s) => s.checks.jobExists)
          .reduce((acc, cur) => {
            const type = cur.type;
            if (acc[type] === undefined) {
              acc[type] = {};
            }
            acc[type][cur.jobId] = cur.namespaces;
            return acc;
          }, {} as { [id: string]: { [id: string]: string[] | undefined } });

        return response.ok({
          body: jobStatus,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobSavedObjects
   *
   * @api {get} /api/ml/saved_objects/models_spaces Get all models and their spaces
   * @apiName ModelsSpaces
   * @apiDescription List all models and their spaces.
   *
   */
  router.get(
    {
      path: '/api/ml/saved_objects/models_spaces',
      validate: false,
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ response, jobSavedObjectService, client }) => {
      try {
        const { checkStatus } = checksFactory(client, jobSavedObjectService);
        const savedObjects = (await checkStatus()).savedObjects;
        const modelStatus = savedObjects.models
          .filter((s) => s.checks.modelExists)
          .reduce(
            (acc, cur) => {
              acc.models[cur.modelId] = cur.namespaces;
              return acc;
            },
            { models: {} } as { models: { [id: string]: string[] | undefined } }
          );

        return response.ok({
          body: modelStatus,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobSavedObjects
   *
   * @api {post} /api/ml/saved_objects/can_delete_job Check whether user can delete a job
   * @apiName CanDeleteJob
   * @apiDescription Check the user's ability to delete jobs. Returns whether they are able
   *                 to fully delete the job and whether they are able to remove it from
   *                 the current space.
   *                 Note, this is only for enabling UI controls. A user calling endpoints
   *                 directly will still be able to delete or remove the job from a space.
   *
   * @apiSchema (params) jobTypeSchema
   * @apiSchema (body) jobIdsSchema
   * @apiSuccessExample {json} Error-Response:
   * {
   *   "my_job": {
   *     "canDelete": false,
   *     "canRemoveFromSpace": true
   *   }
   * }
   *
   */
  router.post(
    {
      path: '/api/ml/saved_objects/can_delete_job/{jobType}',
      validate: {
        params: jobTypeSchema,
        body: canDeleteJobSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs', 'access:ml:canGetDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ request, response, jobSavedObjectService, client }) => {
      try {
        const { jobType } = request.params;
        const { jobIds } = request.body;

        const { canDeleteJobs } = checksFactory(client, jobSavedObjectService);
        const body = await canDeleteJobs(
          request,
          jobType,
          jobIds,
          getSpaces !== undefined,
          resolveMlCapabilities
        );

        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
