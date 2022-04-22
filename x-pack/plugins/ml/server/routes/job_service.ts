/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { schema } from '@kbn/config-schema';
import { wrapError } from '../client/error_wrapper';
import type { RouteInitialization } from '../types';
import {
  categorizationFieldExamplesSchema,
  basicChartSchema,
  populationChartSchema,
  datafeedIdsSchema,
  forceStartDatafeedSchema,
  jobIdsSchema,
  optionalJobIdsSchema,
  jobsWithTimerangeSchema,
  lookBackProgressSchema,
  topCategoriesSchema,
  updateGroupsSchema,
  revertModelSnapshotSchema,
  jobsExistSchema,
  datafeedPreviewSchema,
  bulkCreateSchema,
} from './schemas/job_service_schema';

import { jobIdSchema } from './schemas/anomaly_detectors_schema';

import { jobServiceProvider } from '../models/job_service';
import { categorizationExamplesProvider } from '../models/job_service/new_job';
import { getAuthorizationHeader } from '../lib/request_authorization';
import type { Datafeed, Job } from '../../common/types/anomaly_detection_jobs';

/**
 * Routes for job service
 */
export function jobServiceRoutes({ router, routeGuard }: RouteInitialization) {
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
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { forceStartDatafeeds } = jobServiceProvider(client, mlClient);
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
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { stopDatafeeds } = jobServiceProvider(client, mlClient);
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
      options: {
        tags: ['access:ml:canDeleteJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { deleteJobs } = jobServiceProvider(client, mlClient);
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
      options: {
        tags: ['access:ml:canCloseJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { closeJobs } = jobServiceProvider(client, mlClient);
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
   * @api {post} /api/ml/jobs/reset_jobs Reset multiple jobs
   * @apiName ResetJobs
   * @apiDescription Resets one or more anomaly detection jobs
   *
   * @apiSchema (body) jobIdsSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/reset_jobs',
      validate: {
        body: jobIdsSchema,
      },
      options: {
        tags: ['access:ml:canResetJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { resetJobs } = jobServiceProvider(client, mlClient);
        const { jobIds } = request.body;
        const resp = await resetJobs(jobIds);

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
   * @api {post} /api/ml/jobs/force_stop_and_close_job Force stop and close job
   * @apiName ForceStopAndCloseJob
   * @apiDescription Force stops the datafeed and then force closes the anomaly detection job specified by job ID
   *
   * @apiSchema (body) jobIdSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/force_stop_and_close_job',
      validate: {
        body: jobIdSchema,
      },
      options: {
        tags: ['access:ml:canCloseJob', 'access:ml:canStartStopDatafeed'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { forceStopAndCloseJob } = jobServiceProvider(client, mlClient);
        const { jobId } = request.body;
        const resp = await forceStopAndCloseJob(jobId);

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
   * @apiSchema (body) optionalJobIdsSchema
   *
   * @apiSuccess {Array} jobsList list of jobs. For any supplied job IDs, the job object will contain a fullJob property
   *    which includes the full configuration and stats for the job.
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs_summary',
      validate: {
        body: optionalJobIdsSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response, context }) => {
      try {
        const alerting = await context.alerting;
        const { jobsSummary } = jobServiceProvider(client, mlClient, alerting?.getRulesClient());
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
   * @api {post} /api/ml/jobs/jobs_with_geo Jobs summary
   * @apiName JobsSummary
   * @apiDescription Returns a list of anomaly detection jobs with analysis config with fields supported by maps.
   *
   * @apiSuccess {Array} jobIds list of job ids.
   */
  router.get(
    {
      path: '/api/ml/jobs/jobs_with_geo',
      validate: false,
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, response, context }) => {
      try {
        const alerting = await context.alerting;
        const { getJobIdsWithGeo } = jobServiceProvider(
          client,
          mlClient,
          alerting?.getRulesClient()
        );

        const resp = await getJobIdsWithGeo();

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
        body: jobsWithTimerangeSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, response }) => {
      try {
        const { jobsWithTimerange } = jobServiceProvider(client, mlClient);
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
   * @api {post} /api/ml/jobs/job_for_cloning Get job for cloning
   * @apiName GetJobForCloning
   * @apiDescription Get the job configuration with auto generated fields excluded for cloning
   *
   * @apiSchema (body) jobIdSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/job_for_cloning',
      validate: {
        body: jobIdSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { getJobForCloning } = jobServiceProvider(client, mlClient);
        const { jobId } = request.body;

        const resp = await getJobForCloning(jobId);
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
   * @apiSchema (body) optionalJobIdsSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs',
      validate: {
        body: optionalJobIdsSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response, context }) => {
      try {
        const alerting = await context.alerting;
        const { createFullJobsList } = jobServiceProvider(
          client,
          mlClient,
          alerting?.getRulesClient()
        );
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
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, response }) => {
      try {
        const { getAllGroups } = jobServiceProvider(client, mlClient);
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
        body: updateGroupsSchema,
      },
      options: {
        tags: ['access:ml:canUpdateJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { updateGroups } = jobServiceProvider(client, mlClient);
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
   * @api {get} /api/ml/jobs/blocking_jobs_tasks Get blocking job tasks
   * @apiName BlockingJobTasks
   * @apiDescription Gets the ids of deleting, resetting or reverting anomaly detection jobs
   */
  router.get(
    {
      path: '/api/ml/jobs/blocking_jobs_tasks',
      validate: false,
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, response }) => {
      try {
        const { blockingJobTasks } = jobServiceProvider(client, mlClient);
        const resp = await blockingJobTasks();

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
   * @api {post} /api/ml/jobs/jobs_exist Check whether jobs exists in current or any space
   * @apiName JobsExist
   * @apiDescription Checks if each of the jobs in the specified list of IDs exist.
   *                 If allSpaces is true, the check will look across all spaces.
   *
   * @apiSchema (body) jobsExistSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs_exist',
      validate: {
        body: jobsExistSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { jobsExist } = jobServiceProvider(client, mlClient);
        const { jobIds, allSpaces } = request.body;
        const resp = await jobsExist(jobIds, allSpaces);

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
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(
      async ({ client, mlClient, request, response, getDataViewsService }) => {
        try {
          const { indexPattern } = request.params;
          const isRollup = request.query?.rollup === 'true';
          const { newJobCaps } = jobServiceProvider(client, mlClient);

          const dataViewsService = await getDataViewsService();
          const resp = await newJobCaps(indexPattern, isRollup, dataViewsService);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    )
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
        body: schema.object(basicChartSchema),
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
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
          runtimeMappings,
          indicesOptions,
        } = request.body;

        const { newJobLineChart } = jobServiceProvider(client, mlClient);
        const resp = await newJobLineChart(
          indexPatternTitle,
          timeField,
          start,
          end,
          intervalMs,
          query,
          aggFieldNamePairs,
          splitFieldName,
          splitFieldValue,
          runtimeMappings,
          indicesOptions
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
        body: schema.object(populationChartSchema),
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
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
          runtimeMappings,
          indicesOptions,
        } = request.body;

        const { newJobPopulationChart } = jobServiceProvider(client, mlClient);
        const resp = await newJobPopulationChart(
          indexPatternTitle,
          timeField,
          start,
          end,
          intervalMs,
          query,
          aggFieldNamePairs,
          splitFieldName,
          runtimeMappings,
          indicesOptions
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
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, response }) => {
      try {
        const { getAllJobAndGroupIds } = jobServiceProvider(client, mlClient);
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
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { getLookBackProgress } = jobServiceProvider(client, mlClient);
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
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { validateCategoryExamples } = categorizationExamplesProvider(client);
        const {
          indexPatternTitle,
          timeField,
          query,
          size,
          field,
          start,
          end,
          analyzer,
          runtimeMappings,
          indicesOptions,
        } = request.body;

        const resp = await validateCategoryExamples(
          indexPatternTitle,
          query,
          size,
          field,
          timeField,
          start,
          end,
          analyzer,
          runtimeMappings,
          indicesOptions
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
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { topCategories } = jobServiceProvider(client, mlClient);
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

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/datafeed_preview Get datafeed preview
   * @apiName DatafeedPreview
   * @apiDescription Returns a preview of the datafeed search
   *
   * @apiSchema (body) datafeedPreviewSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/datafeed_preview',
      validate: {
        body: datafeedPreviewSchema,
      },
      options: {
        tags: ['access:ml:canPreviewDatafeed'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { datafeedId, job, datafeed } = request.body;

        const payload =
          datafeedId !== undefined
            ? {
                datafeed_id: datafeedId,
              }
            : ({
                body: {
                  job_config: job,
                  datafeed_config: datafeed,
                },
              } as estypes.MlPreviewDatafeedRequest);

        const body = await mlClient.previewDatafeed(payload, getAuthorizationHeader(request));
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/revert_model_snapshot Revert model snapshot
   * @apiName RevertModelSnapshot
   * @apiDescription Reverts a job to a specified snapshot. Also allows the job to replayed to a specified date and to auto create calendars to skip analysis of specified date ranges
   *
   * @apiSchema (body) revertModelSnapshotSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/revert_model_snapshot',
      validate: {
        body: revertModelSnapshotSchema,
      },
      options: {
        tags: ['access:ml:canCreateJob', 'access:ml:canStartStopDatafeed'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { revertModelSnapshot } = jobServiceProvider(client, mlClient);
        const { jobId, snapshotId, replay, end, deleteInterveningResults, calendarEvents } =
          request.body;
        const resp = await revertModelSnapshot(
          jobId,
          snapshotId,
          replay,
          end,
          deleteInterveningResults,
          calendarEvents
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
   * @api {post} /api/ml/jobs/bulk_create Bulk create jobs and datafeeds
   * @apiName BulkCreateJobs
   * @apiDescription Bulk create jobs and datafeeds.
   *
   * @apiSchema (body) bulkCreateSchema
   */
  router.post(
    {
      path: '/api/ml/jobs/bulk_create',
      validate: {
        body: bulkCreateSchema,
      },
      options: {
        tags: ['access:ml:canPreviewDatafeed'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const bulkJobs = request.body;

        const { bulkCreate } = jobServiceProvider(client, mlClient);
        const jobs = (Array.isArray(bulkJobs) ? bulkJobs : [bulkJobs]) as Array<{
          job: Job;
          datafeed: Datafeed;
        }>;
        const body = await bulkCreate(jobs, getAuthorizationHeader(request));
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
