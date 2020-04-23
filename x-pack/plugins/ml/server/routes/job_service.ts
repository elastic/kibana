/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from 'kibana/server';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import {
  categorizationFieldExamplesSchema,
  chartSchema,
  datafeedIdsSchema,
  forceStartDatafeedSchema,
  jobIdsSchema,
  jobsWithTimerangeSchema,
  lookBackProgressSchema,
  topCategoriesSchema,
  updateGroupsSchema,
} from './schemas/job_service_schema';

import { jobServiceProvider } from '../models/job_service';
import { categorizationExamplesProvider } from '../models/job_service/new_job';

/**
 * Routes for job service
 */
export function jobServiceRoutes({ router, mlLicense }: RouteInitialization) {
  async function hasPermissionToCreateJobs(
    callAsCurrentUser: IScopedClusterClient['callAsCurrentUser']
  ) {
    if (mlLicense.isSecurityEnabled() === false) {
      return true;
    }

    const resp = await callAsCurrentUser('ml.privilegeCheck', {
      body: {
        cluster: [
          'cluster:admin/xpack/ml/job/put',
          'cluster:admin/xpack/ml/job/open',
          'cluster:admin/xpack/ml/datafeeds/put',
        ],
      },
    });
    return resp.has_all_requested;
  }

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/force_start_datafeeds Start datafeeds
   * @apiName ForceStartDatafeeds
   * @apiDescription Starts one or more datafeeds
   *
   * @apiSchema (body) forceStartDatafeedSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/force_start_datafeeds',
      validate: {
        body: forceStartDatafeedSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { forceStartDatafeeds } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { datafeedIds, start, end } = request.body;
        const resp = await forceStartDatafeeds(datafeedIds, start, end);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/stop_datafeeds Stop datafeeds
   * @apiName StopDatafeeds
   * @apiDescription Stops one or more datafeeds
   *
   * @apiSchema (body) datafeedIdsSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/stop_datafeeds',
      validate: {
        body: datafeedIdsSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { stopDatafeeds } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { datafeedIds } = request.body;
        const resp = await stopDatafeeds(datafeedIds);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/delete_jobs Delete jobs
   * @apiName DeleteJobs
   * @apiDescription Deletes an existing anomaly detection job
   *
   * @apiSchema (body) jobIdsSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/delete_jobs',
      validate: {
        body: jobIdsSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { deleteJobs } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobIds } = request.body;
        const resp = await deleteJobs(jobIds);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/close_jobs Close jobs
   * @apiName CloseJobs
   * @apiDescription Closes one or more anomaly detection jobs
   *
   * @apiSchema (body) jobIdsSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/close_jobs',
      validate: {
        body: jobIdsSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { closeJobs } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobIds } = request.body;
        const resp = await closeJobs(jobIds);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/jobs_summary Jobs summary
   * @apiName JobsSummary
   * @apiDescription Returns a list of anomaly detection jobs, with summary level information for every job.
   *  For any supplied job IDs, full job information will be returned, which include the analysis configuration,
   *  job stats, datafeed stats, and calendars.
   *
   * @apiSchema (body) jobIdsSchema
   *
   * @apiSuccess {Array} jobsList list of jobs. For any supplied job IDs, the job object will contain a fullJob property
   *    which includes the full configuration and stats for the job.
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs_summary',
      validate: {
        body: jobIdsSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { jobsSummary } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobIds } = request.body;
        const resp = await jobsSummary(jobIds);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/jobs_with_time_range Jobs with time range
   * @apiName JobsWithTimeRange
   * @apiDescription Creates a list of jobs with data about the job's time range
   *
   * @apiSchema (body) jobsWithTimerangeSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs_with_time_range',
      validate: {
        body: schema.object(jobsWithTimerangeSchema),
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { jobsWithTimerange } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const resp = await jobsWithTimerange();

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/jobs Create jobs list
   * @apiName CreateFullJobsList
   * @apiDescription Creates a list of jobs
   *
   * @apiSchema (body) jobIdsSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs',
      validate: {
        body: jobIdsSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { createFullJobsList } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobIds } = request.body;
        const resp = await createFullJobsList(jobIds);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {get} /api/ml/jobs/groups Get job groups
   * @apiName GetAllGroups
   * @apiDescription Returns array of group objects with job ids listed for each group
   */
  router.get(
    {
      path: '/api/ml/jobs/groups',
      validate: false,
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { getAllGroups } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const resp = await getAllGroups();

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/update_groups Update job groups
   * @apiName UpdateGroups
   * @apiDescription Updates 'groups' property of an anomaly detection job
   *
   * @apiSchema (body) updateGroupsSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/update_groups',
      validate: {
        body: schema.object(updateGroupsSchema),
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { updateGroups } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobs } = request.body;
        const resp = await updateGroups(jobs);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {get} /api/ml/jobs/deleting_jobs_tasks Get deleting  job tasks
   * @apiName DeletingJobTasks
   * @apiDescription Gets the ids of deleting anomaly detection jobs
   */
  router.get(
    {
      path: '/api/ml/jobs/deleting_jobs_tasks',
      validate: false,
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { deletingJobTasks } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const resp = await deletingJobTasks();

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/jobs_exist Check if jobs exist
   * @apiName JobsExist
   * @apiDescription Checks if each of the jobs in the specified list of IDs exist
   *
   * @apiSchema (body) jobIdsSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs_exist',
      validate: {
        body: jobIdsSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { jobsExist } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobIds } = request.body;
        const resp = await jobsExist(jobIds);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {get} /api/ml/jobs/new_job_caps/:indexPattern Get new job capabilities
   * @apiName NewJobCaps
   * @apiDescription Retrieve the capabilities of fields for indices
   */
  router.get(
    {
      path: '/api/ml/jobs/new_job_caps/{indexPattern}',
      validate: {
        params: schema.object({ indexPattern: schema.string() }),
        query: schema.maybe(schema.object({ rollup: schema.maybe(schema.string()) })),
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { indexPattern } = request.params;
        const isRollup = request.query.rollup === 'true';
        const savedObjectsClient = context.core.savedObjects.client;
        const { newJobCaps } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const resp = await newJobCaps(indexPattern, isRollup, savedObjectsClient);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/new_job_line_chart Get job line chart data
   * @apiName NewJobLineChart
   * @apiDescription Returns line chart data for anomaly detection job
   *
   * @apiSchema (body) chartSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/new_job_line_chart',
      validate: {
        body: schema.object(chartSchema),
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const {
          indexPatternTitle,
          timeField,
          start,
          end,
          intervalMs,
          query,
          aggFieldNamePairs,
          splitFieldName,
          splitFieldValue,
        } = request.body;

        const { newJobLineChart } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const resp = await newJobLineChart(
          indexPatternTitle,
          timeField,
          start,
          end,
          intervalMs,
          query,
          aggFieldNamePairs,
          splitFieldName,
          splitFieldValue
        );

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/new_job_population_chart Get population job chart data
   * @apiName NewJobPopulationChart
   * @apiDescription Returns population job chart data
   *
   * @apiSchema (body) chartSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/new_job_population_chart',
      validate: {
        body: schema.object(chartSchema),
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const {
          indexPatternTitle,
          timeField,
          start,
          end,
          intervalMs,
          query,
          aggFieldNamePairs,
          splitFieldName,
        } = request.body;

        const { newJobPopulationChart } = jobServiceProvider(
          context.ml!.mlClient.callAsCurrentUser
        );
        const resp = await newJobPopulationChart(
          indexPatternTitle,
          timeField,
          start,
          end,
          intervalMs,
          query,
          aggFieldNamePairs,
          splitFieldName
        );

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {get} /api/ml/jobs/all_jobs_and_group_ids Get all job and group IDs
   * @apiName GetAllJobAndGroupIds
   * @apiDescription Returns a list of all job IDs and all group IDs
   */
  router.get(
    {
      path: '/api/ml/jobs/all_jobs_and_group_ids',
      validate: false,
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { getAllJobAndGroupIds } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const resp = await getAllJobAndGroupIds();

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/look_back_progress Get lookback progress
   * @apiName GetLookBackProgress
   * @apiDescription Returns current progress of anomaly detection job
   *
   * @apiSchema (body) lookBackProgressSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/look_back_progress',
      validate: {
        body: schema.object(lookBackProgressSchema),
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { getLookBackProgress } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobId, start, end } = request.body;
        const resp = await getLookBackProgress(jobId, start, end);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/categorization_field_examples Get categorization field examples
   * @apiName ValidateCategoryExamples
   * @apiDescription Validates category examples
   *
   * @apiSchema (body) categorizationFieldExamplesSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/categorization_field_examples',
      validate: {
        body: schema.object(categorizationFieldExamplesSchema),
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        // due to the use of the _analyze endpoint which is called by the kibana user,
        // basic job creation privileges are required to use this endpoint
        if ((await hasPermissionToCreateJobs(context.ml!.mlClient.callAsCurrentUser)) === false) {
          throw Boom.forbidden(
            'Insufficient privileges, the machine_learning_admin role is required.'
          );
        }

        const { validateCategoryExamples } = categorizationExamplesProvider(
          context.ml!.mlClient.callAsCurrentUser,
          context.ml!.mlClient.callAsInternalUser
        );
        const {
          indexPatternTitle,
          timeField,
          query,
          size,
          field,
          start,
          end,
          analyzer,
        } = request.body;

        const resp = await validateCategoryExamples(
          indexPatternTitle,
          query,
          size,
          field,
          timeField,
          start,
          end,
          analyzer
        );

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/top_categories Get top categories
   * @apiName TopCategories
   * @apiDescription Returns list of top categories
   *
   * @apiSchema (body) topCategoriesSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/top_categories',
      validate: {
        body: schema.object(topCategoriesSchema),
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { topCategories } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobId, count } = request.body;
        const resp = await topCategories(jobId, count);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
