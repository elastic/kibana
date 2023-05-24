/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';
import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
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
import { getAuthorizationHeader } from '../lib/request_authorization';

/**
 * Routes for the anomaly detectors
 */
export function jobRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /internal/ml/anomaly_detectors Get anomaly detectors data
   * @apiName GetAnomalyDetectors
   * @apiDescription Returns the list of anomaly detection jobs.
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} jobs
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
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
   * @api {get} /internal/ml/anomaly_detectors/:jobId Get anomaly detection data by id
   * @apiName GetAnomalyDetectorsById
   * @apiDescription Returns the anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
          },
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
   * @api {get} /internal/ml/anomaly_detectors/_stats Get anomaly detection stats
   * @apiName GetAnomalyDetectorsStats
   * @apiDescription Returns anomaly detection jobs statistics.
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} jobs
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/_stats`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
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
   * @api {get} /internal/ml/anomaly_detectors/:jobId/_stats Get stats for requested anomaly detection job
   * @apiName GetAnomalyDetectorsStatsById
   * @apiDescription Returns anomaly detection job statistics.
   *
   * @apiSchema (params) jobIdSchema
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/_stats`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
          },
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
   * @api {put} /internal/ml/anomaly_detectors/:jobId Create an anomaly detection job
   * @apiName CreateAnomalyDetectors
   * @apiDescription Creates an anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (body) anomalyDetectionJobSchema
   *
   * @apiSuccess {Object} job the configuration of the job that has been created.
   */
  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            body: schema.object(anomalyDetectionJobSchema),
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { jobId } = request.params;
          const body = await mlClient.putJob(
            {
              job_id: jobId,
              // @ts-expect-error job type custom_rules is incorrect
              body: request.body,
            },
            getAuthorizationHeader(request)
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
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /internal/ml/anomaly_detectors/:jobId/_update Update an anomaly detection job
   * @apiName UpdateAnomalyDetectors
   * @apiDescription Updates certain properties of an anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (body) anomalyDetectionUpdateJobSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/_update`,
      access: 'internal',
      options: {
        tags: ['access:ml:canUpdateJob'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            body: anomalyDetectionUpdateJobSchema,
          },
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
   * @api {post} /internal/ml/anomaly_detectors/:jobId/_open Open specified job
   * @apiName OpenAnomalyDetectorsJob
   * @apiDescription Opens an anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/_open`,
      access: 'internal',
      options: {
        tags: ['access:ml:canOpenJob'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
          },
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
   * @api {post} /internal/ml/anomaly_detectors/:jobId/_close Close specified job
   * @apiName CloseAnomalyDetectorsJob
   * @apiDescription Closes an anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (query) forceQuerySchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/_close`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCloseJob'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            query: forceQuerySchema,
          },
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
   * @api {post} /internal/ml/anomaly_detectors/:jobId/_reset Reset specified job
   * @apiName ResetAnomalyDetectorsJob
   * @apiDescription Resets an anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (query) jobResetQuerySchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/_reset`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCloseJob'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            query: jobResetQuerySchema,
          },
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
   * @api {delete} /internal/ml/anomaly_detectors/:jobId Delete specified job
   * @apiName DeleteAnomalyDetectorsJob
   * @apiDescription Deletes specified anomaly detection job.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (query) forceQuerySchema
   */
  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canDeleteJob'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            query: forceQuerySchema,
          },
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
   * @api {post} /internal/ml/anomaly_detectors/_validate/detector Validate detector
   * @apiName ValidateAnomalyDetector
   * @apiDescription Validates specified detector.
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/_validate/detector`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateJob'],
      },
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
   * @api {post} /internal/ml/anomaly_detectors/:jobId/_forecast Create forecast for specified job
   * @apiName ForecastAnomalyDetector
   * @apiDescription Creates a forecast for the specified anomaly detection job, predicting the future behavior of a time series by using its historical behavior.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (body) forecastAnomalyDetector
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/_forecast`,
      access: 'internal',
      options: {
        tags: ['access:ml:canForecastJob'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            body: forecastAnomalyDetector,
          },
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
   * @api {post} /internal/ml/anomaly_detectors/:jobId/results/records  Retrieves anomaly records for a job.
   * @apiName GetRecords
   * @apiDescription Retrieves anomaly records for a job.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (body) getRecordsSchema
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} records
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/results/records`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            body: getRecordsSchema,
          },
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
   * @api {post} /internal/ml/anomaly_detectors/:jobId/results/buckets  Obtain bucket scores for the specified job ID
   * @apiName GetBuckets
   * @apiDescription The get buckets API presents a chronological view of the records, grouped by bucket.
   *
   * @apiSchema (params) getBucketParamsSchema
   * @apiSchema (body) getBucketsSchema
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} buckets
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/results/buckets/{timestamp?}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: getBucketParamsSchema,
            body: getBucketsSchema,
          },
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
   * @api {post} /internal/ml/anomaly_detectors/:jobId/results/overall_buckets  Obtain overall bucket scores for the specified job ID
   * @apiName GetOverallBuckets
   * @apiDescription Retrieves overall bucket results that summarize the bucket results of multiple anomaly detection jobs.
   *
   * @apiSchema (params) jobIdSchema
   * @apiSchema (body) getOverallBucketsSchema
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} overall_buckets
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/results/overall_buckets`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            body: getOverallBucketsSchema,
          },
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
   * @api {get} /internal/ml/anomaly_detectors/:jobId/results/categories/:categoryId Get results category data by job ID and category ID
   * @apiName GetCategories
   * @apiDescription Returns the categories results for the specified job ID and category ID.
   *
   * @apiSchema (params) getCategoriesSchema
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/results/categories/{categoryId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: getCategoriesSchema,
          },
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
   * @api {get} /internal/ml/anomaly_detectors/:jobId/model_snapshots Get model snapshots by job ID
   * @apiName GetModelSnapshots
   * @apiDescription Returns the model snapshots for the specified job ID
   *
   * @apiSchema (params) getModelSnapshotsSchema
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/model_snapshots`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: getModelSnapshotsSchema,
          },
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
   * @api {get} /internal/ml/anomaly_detectors/:jobId/model_snapshots/:snapshotId Get model snapshots by job ID and snapshot ID
   * @apiName GetModelSnapshotsById
   * @apiDescription Returns the model snapshots for the specified job ID and snapshot ID
   *
   * @apiSchema (params) getModelSnapshotsSchema
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/model_snapshots/{snapshotId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: getModelSnapshotsSchema,
          },
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
   * @api {post} /internal/ml/anomaly_detectors/:jobId/model_snapshots/:snapshotId/_update Update model snapshot by snapshot ID
   * @apiName UpdateModelSnapshotsById
   * @apiDescription Updates the model snapshot for the specified snapshot ID
   *
   * @apiSchema (params) updateModelSnapshotsSchema
   * @apiSchema (body) updateModelSnapshotBodySchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/model_snapshots/{snapshotId}/_update`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: updateModelSnapshotsSchema,
            body: updateModelSnapshotBodySchema,
          },
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
   * @api {delete} /internal/ml/anomaly_detectors/:jobId/model_snapshots/:snapshotId Delete model snapshots by snapshot ID
   * @apiName GetModelSnapshotsById
   * @apiDescription Deletes the model snapshot for the specified snapshot ID
   *
   * @apiSchema (params) updateModelSnapshotsSchema
   */
  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/model_snapshots/{snapshotId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: updateModelSnapshotsSchema,
          },
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
