/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { schema } from '@kbn/config-schema';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import {
  anomalyDetectionJobSchema,
  anomalyDetectionUpdateJobSchema,
  jobIdSchema,
  getRecordsSchema,
  getBucketsSchema,
  getOverallBucketsSchema,
  getCategoriesSchema,
  forecastAnomalyDetector,
  getBucketParamsSchema,
  getModelSnapshotsSchema,
  updateModelSnapshotsSchema,
  updateModelSnapshotBodySchema,
  forceQuerySchema,
  jobResetQuerySchema,
} from './schemas/anomaly_detectors_schema';

/**
 * Routes for the anomaly detectors
 */
export function jobRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /api/ml/anomaly_detectors Get anomaly detectors data
   * @apiName GetAnomalyDetectors
   * @apiDescription Returns the list of anomaly detection jobs.
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} jobs
   */
  router.get(
    {
      path: '/api/ml/anomaly_detectors',
      validate: false,
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
      try {
        const body = await mlClient.getJobs();
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /api/ml/anomaly_detectors/:jobId Get anomaly detection data by id
   * @apiName GetAnomalyDetectorsById
   * @apiDescription Returns the anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   */
  router.get(
    {
      path: '/api/ml/anomaly_detectors/{jobId}',
      validate: {
        params: jobIdSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { jobId } = request.params;
        const body = await mlClient.getJobs({ job_id: jobId });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /api/ml/anomaly_detectors/_stats Get anomaly detection stats
   * @apiName GetAnomalyDetectorsStats
   * @apiDescription Returns anomaly detection jobs statistics.
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} jobs
   */
  router.get(
    {
      path: '/api/ml/anomaly_detectors/_stats',
      validate: false,
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
      try {
        const body = await mlClient.getJobStats();
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /api/ml/anomaly_detectors/:jobId/_stats Get stats for requested anomaly detection job
   * @apiName GetAnomalyDetectorsStatsById
   * @apiDescription Returns anomaly detection job statistics.
   *
   * @apiSchema (params) jobIdSchema
   */
  router.get(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/_stats',
      validate: {
        params: jobIdSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { jobId } = request.params;
        const body = await mlClient.getJobStats({ job_id: jobId });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {put} /api/ml/anomaly_detectors/:jobId Create an anomaly detection job
   * @apiName CreateAnomalyDetectors
   * @apiDescription Creates an anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (body) anomalyDetectionJobSchema
   *
   * @apiSuccess {Object} job the configuration of the job that has been created.
   */
  router.put(
    {
      path: '/api/ml/anomaly_detectors/{jobId}',
      validate: {
        params: jobIdSchema,
        body: schema.object(anomalyDetectionJobSchema),
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { jobId } = request.params;
        const body = await mlClient.putJob({
          job_id: jobId,
          // @ts-expect-error job type custom_rules is incorrect
          body: request.body,
        });

        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/_update Update an anomaly detection job
   * @apiName UpdateAnomalyDetectors
   * @apiDescription Updates certain properties of an anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (body) anomalyDetectionUpdateJobSchema
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/_update',
      validate: {
        params: jobIdSchema,
        body: anomalyDetectionUpdateJobSchema,
      },
      options: {
        tags: ['access:ml:canUpdateJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { jobId } = request.params;
        const body = await mlClient.updateJob({
          job_id: jobId,
          // @ts-expect-error MlDetector is not compatible
          body: request.body,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/_open Open specified job
   * @apiName OpenAnomalyDetectorsJob
   * @apiDescription Opens an anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/_open',
      validate: {
        params: jobIdSchema,
      },
      options: {
        tags: ['access:ml:canOpenJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { jobId } = request.params;
        const body = await mlClient.openJob({ job_id: jobId });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/_close Close specified job
   * @apiName CloseAnomalyDetectorsJob
   * @apiDescription Closes an anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (query) forceQuerySchema
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/_close',
      validate: {
        params: jobIdSchema,
        query: forceQuerySchema,
      },
      options: {
        tags: ['access:ml:canCloseJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const options: estypes.MlCloseJobRequest = {
          job_id: request.params.jobId,
        };
        const force = request.query.force;
        if (force !== undefined) {
          options.force = force;
        }
        const body = await mlClient.closeJob(options);
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/_reset Reset specified job
   * @apiName ResetAnomalyDetectorsJob
   * @apiDescription Resets an anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (query) jobResetQuerySchema
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/_reset',
      validate: {
        params: jobIdSchema,
        query: jobResetQuerySchema,
      },
      options: {
        tags: ['access:ml:canCloseJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const options: { job_id: string; wait_for_completion?: boolean } = {
          // TODO change this to correct resetJob request type
          job_id: request.params.jobId,
          ...(request.query.wait_for_completion !== undefined
            ? { wait_for_completion: request.query.wait_for_completion }
            : {}),
        };
        const body = await mlClient.resetJob(options);
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {delete} /api/ml/anomaly_detectors/:jobId Delete specified job
   * @apiName DeleteAnomalyDetectorsJob
   * @apiDescription Deletes specified anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (query) forceQuerySchema
   */
  router.delete(
    {
      path: '/api/ml/anomaly_detectors/{jobId}',
      validate: {
        params: jobIdSchema,
        query: forceQuerySchema,
      },
      options: {
        tags: ['access:ml:canDeleteJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const options: estypes.MlDeleteJobRequest = {
          job_id: request.params.jobId,
          wait_for_completion: false,
        };
        const force = request.query.force;
        if (force !== undefined) {
          options.force = force;
        }
        const body = await mlClient.deleteJob(options);
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/_validate/detector Validate detector
   * @apiName ValidateAnomalyDetector
   * @apiDescription Validates specified detector.
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/_validate/detector',
      validate: {
        body: schema.any(),
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.validateDetector({ body: request.body });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/_forecast Create forecast for specified job
   * @apiName ForecastAnomalyDetector
   * @apiDescription Creates a forecast for the specified anomaly detection job, predicting the future behavior of a time series by using its historical behavior.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (body) forecastAnomalyDetector
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/_forecast',
      validate: {
        params: jobIdSchema,
        body: forecastAnomalyDetector,
      },
      options: {
        tags: ['access:ml:canForecastJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const jobId = request.params.jobId;
        const duration = request.body.duration;
        const body = await mlClient.forecast({
          job_id: jobId,
          body: {
            duration,
          },
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/results/records  Retrieves anomaly records for a job.
   * @apiName GetRecords
   * @apiDescription Retrieves anomaly records for a job.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (body) getRecordsSchema
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} records
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/results/records',
      validate: {
        params: jobIdSchema,
        body: getRecordsSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.getRecords({
          job_id: request.params.jobId,
          body: request.body,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/results/buckets  Obtain bucket scores for the specified job ID
   * @apiName GetBuckets
   * @apiDescription The get buckets API presents a chronological view of the records, grouped by bucket.
   *
   * @apiSchema (params) getBucketParamsSchema
   * @apiSchema (body) getBucketsSchema
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} buckets
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/results/buckets/{timestamp?}',
      validate: {
        params: getBucketParamsSchema,
        body: getBucketsSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.getBuckets({
          job_id: request.params.jobId,
          timestamp: request.params.timestamp,
          body: request.body,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/results/overall_buckets  Obtain overall bucket scores for the specified job ID
   * @apiName GetOverallBuckets
   * @apiDescription Retrieves overall bucket results that summarize the bucket results of multiple anomaly detection jobs.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (body) getOverallBucketsSchema
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} overall_buckets
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/results/overall_buckets',
      validate: {
        params: jobIdSchema,
        body: getOverallBucketsSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.getOverallBuckets({
          job_id: request.params.jobId,
          top_n: request.body.topN,
          bucket_span: request.body.bucketSpan,
          start: request.body.start !== undefined ? String(request.body.start) : undefined,
          end: request.body.end !== undefined ? String(request.body.end) : undefined,
          overall_score: request.body.overall_score ?? 0,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /api/ml/anomaly_detectors/:jobId/results/categories/:categoryId Get results category data by job ID and category ID
   * @apiName GetCategories
   * @apiDescription Returns the categories results for the specified job ID and category ID.
   *
   * @apiSchema (params) getCategoriesSchema
   */
  router.get(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/results/categories/{categoryId}',
      validate: {
        params: getCategoriesSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.getCategories({
          job_id: request.params.jobId,
          category_id: request.params.categoryId,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /api/ml/anomaly_detectors/:jobId/model_snapshots Get model snapshots by job ID
   * @apiName GetModelSnapshots
   * @apiDescription Returns the model snapshots for the specified job ID
   *
   * @apiSchema (params) getModelSnapshotsSchema
   */
  router.get(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/model_snapshots',
      validate: {
        params: getModelSnapshotsSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.getModelSnapshots({
          job_id: request.params.jobId,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /api/ml/anomaly_detectors/:jobId/model_snapshots/:snapshotId Get model snapshots by job ID and snapshot ID
   * @apiName GetModelSnapshotsById
   * @apiDescription Returns the model snapshots for the specified job ID and snapshot ID
   *
   * @apiSchema (params) getModelSnapshotsSchema
   */
  router.get(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/model_snapshots/{snapshotId}',
      validate: {
        params: getModelSnapshotsSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.getModelSnapshots({
          job_id: request.params.jobId,
          snapshot_id: request.params.snapshotId,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/model_snapshots/:snapshotId/_update Update model snapshot by snapshot ID
   * @apiName UpdateModelSnapshotsById
   * @apiDescription Updates the model snapshot for the specified snapshot ID
   *
   * @apiSchema (params) updateModelSnapshotsSchema
   * @apiSchema (body) updateModelSnapshotBodySchema
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/model_snapshots/{snapshotId}/_update',
      validate: {
        params: updateModelSnapshotsSchema,
        body: updateModelSnapshotBodySchema,
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.updateModelSnapshot({
          job_id: request.params.jobId,
          snapshot_id: request.params.snapshotId,
          body: request.body,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {delete} /api/ml/anomaly_detectors/:jobId/model_snapshots/:snapshotId Delete model snapshots by snapshot ID
   * @apiName GetModelSnapshotsById
   * @apiDescription Deletes the model snapshot for the specified snapshot ID
   *
   * @apiSchema (params) updateModelSnapshotsSchema
   */
  router.delete(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/model_snapshots/{snapshotId}',
      validate: {
        params: updateModelSnapshotsSchema,
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.deleteModelSnapshot({
          job_id: request.params.jobId,
          snapshot_id: request.params.snapshotId,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
