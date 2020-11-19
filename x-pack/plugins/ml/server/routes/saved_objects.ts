/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError } from '../client/error_wrapper';
import { RouteInitialization, SavedObjectsRouteDeps } from '../types';
import { checksFactory, repairFactory } from '../saved_objects';
import { jobsAndSpaces, repairJobObjects, jobTypeSchema } from './schemas/saved_objects';
import { jobIdsSchema } from './schemas/job_service_schema';

/**
 * Routes for job saved object management
 */
export function savedObjectsRoutes(
  { router, routeGuard }: RouteInitialization,
  { spacesPlugin }: SavedObjectsRouteDeps
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
   * @api {get} /api/ml/saved_objects/repair Repair job saved objects
   * @apiName RepairJobSavedObjects
   * @apiDescription Create saved objects for jobs which are missing them.
   *                 Delete saved objects for jobs which no longer exist.
   *                 Update missing datafeed ids in saved objects for datafeeds which exist.
   *                 Remove datafeed ids for datafeeds which no longer exist.
   *
   */
  router.get(
    {
      path: '/api/ml/saved_objects/repair',
      validate: {
        query: repairJobObjects,
      },
      options: {
        tags: ['access:ml:canCreateJob', 'access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response, jobSavedObjectService }) => {
      try {
        const { simulate } = request.query;
        const { repairJobs } = repairFactory(client, jobSavedObjectService);
        const savedObjects = await repairJobs(simulate);

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
        query: repairJobObjects,
      },
      options: {
        tags: ['access:ml:canCreateJob', 'access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response, jobSavedObjectService }) => {
      try {
        const { simulate } = request.query;
        const { initSavedObjects } = repairFactory(client, jobSavedObjectService);
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
   * @api {post} /api/ml/saved_objects/assign_job_to_space Assign jobs to spaces
   * @apiName AssignJobsToSpaces
   * @apiDescription Add list of spaces to a list of jobs
   *
   * @apiSchema (body) jobsAndSpaces
   */
  router.post(
    {
      path: '/api/ml/saved_objects/assign_job_to_space',
      validate: {
        body: jobsAndSpaces,
      },
      options: {
        tags: ['access:ml:canCreateJob', 'access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ request, response, jobSavedObjectService }) => {
      try {
        const { jobType, jobIds, spaces } = request.body;

        const body = await jobSavedObjectService.assignJobsToSpaces(jobType, jobIds, spaces);

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
   * @api {post} /api/ml/saved_objects/remove_job_from_space Remove jobs from spaces
   * @apiName RemoveJobsFromSpaces
   * @apiDescription Remove a list of spaces from a list of jobs
   *
   * @apiSchema (body) jobsAndSpaces
   */
  router.post(
    {
      path: '/api/ml/saved_objects/remove_job_from_space',
      validate: {
        body: jobsAndSpaces,
      },
      options: {
        tags: ['access:ml:canCreateJob', 'access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ request, response, jobSavedObjectService }) => {
      try {
        const { jobType, jobIds, spaces } = request.body;

        const body = await jobSavedObjectService.removeJobsFromSpaces(jobType, jobIds, spaces);

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
   * @api {get} /api/ml/saved_objects/jobs_spaces All spaces in all jobs
   * @apiName JobsSpaces
   * @apiDescription List all jobs and their spaces
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
        const allStatuses = Object.values((await checkStatus()).savedObjects).flat();

        const body = allStatuses
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
   * @api {get} /api/ml/saved_objects/delete_job_check Check whether user can delete a job
   * @apiName JobsSpaces
   * @apiDescription List all jobs and their spaces
   *
   */
  router.post(
    {
      path: '/api/ml/saved_objects/delete_job_check/{jobType}',
      validate: {
        params: jobTypeSchema,
        body: jobIdsSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs', 'access:ml:canGetDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ request, response, jobSavedObjectService, client }) => {
      try {
        const { jobType } = request.params;
        const { jobIds }: { jobIds: string[] } = request.body;

        const { deleteJobsCheck } = checksFactory(client, jobSavedObjectService);
        const body = await deleteJobsCheck(request, jobType, jobIds, spacesPlugin !== undefined);

        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
