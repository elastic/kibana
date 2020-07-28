/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { RequestHandlerContext } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { AnalysisConfig } from '../../common/types/anomaly_detection_jobs';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import {
  estimateBucketSpanSchema,
  modelMemoryLimitSchema,
  validateCardinalitySchema,
  validateJobSchema,
} from './schemas/job_validation_schema';
import { estimateBucketSpanFactory } from '../models/bucket_span_estimator';
import { calculateModelMemoryLimitProvider } from '../models/calculate_model_memory_limit';
import { validateJob, validateCardinality } from '../models/job_validation';

type CalculateModelMemoryLimitPayload = TypeOf<typeof modelMemoryLimitSchema>;

/**
 * Routes for job validation
 */
export function jobValidationRoutes({ router, mlLicense }: RouteInitialization, version: string) {
  function calculateModelMemoryLimit(
    context: RequestHandlerContext,
    payload: CalculateModelMemoryLimitPayload
  ) {
    const { analysisConfig, indexPattern, query, timeFieldName, earliestMs, latestMs } = payload;

    return calculateModelMemoryLimitProvider(context.ml!.mlClient)(
      analysisConfig as AnalysisConfig,
      indexPattern,
      query,
      timeFieldName,
      earliestMs,
      latestMs
    );
  }

  /**
   * @apiGroup JobValidation
   *
   * @api {post} /api/ml/validate/estimate_bucket_span Estimate bucket span
   * @apiName EstimateBucketSpan
   * @apiDescription  Estimates minimum viable bucket span based on the characteristics of a pre-viewed subset of the data
   *
   * @apiSchema (body) estimateBucketSpanSchema
   */
  router.post(
    {
      path: '/api/ml/validate/estimate_bucket_span',
      validate: {
        body: estimateBucketSpanSchema,
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        let errorResp;
        const resp = await estimateBucketSpanFactory(context.ml!.mlClient)(request.body)
          // this catch gets triggered when the estimation code runs without error
          // but isn't able to come up with a bucket span estimation.
          // this doesn't return a HTTP error but an object with an error message
          // which the client is then handling. triggering a HTTP error would be
          // too severe for this case.
          .catch((error: any) => {
            errorResp = {
              error: true,
              message: error,
            };
          });

        return response.ok({
          body: errorResp !== undefined ? errorResp : resp,
        });
      } catch (e) {
        // this catch gets triggered when an actual error gets thrown when running
        // the estimation code, for example when the request payload is malformed
        throw Boom.badRequest(e);
      }
    })
  );

  /**
   * @apiGroup JobValidation
   *
   * @api {post} /api/ml/validate/calculate_model_memory_limit Calculates model memory limit
   * @apiName CalculateModelMemoryLimit
   * @apiDescription Calls _estimate_model_memory endpoint to retrieve model memory estimation.
   *
   * @apiSchema (body) modelMemoryLimitSchema
   *
   * @apiSuccess {String} modelMemoryLimit
   */
  router.post(
    {
      path: '/api/ml/validate/calculate_model_memory_limit',
      validate: {
        body: modelMemoryLimitSchema,
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const resp = await calculateModelMemoryLimit(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobValidation
   *
   * @api {post} /api/ml/validate/cardinality Validate cardinality
   * @apiName ValidateCardinality
   * @apiDescription Validates cardinality for the given job configuration
   *
   * @apiSchema (body) validateCardinalitySchema
   */
  router.post(
    {
      path: '/api/ml/validate/cardinality',
      validate: {
        body: validateCardinalitySchema,
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const resp = await validateCardinality(context.ml!.mlClient, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobValidation
   *
   * @api {post} /api/ml/validate/job Validates job
   * @apiName ValidateJob
   * @apiDescription Validates the given job configuration
   *
   * @apiSchema (body) validateJobSchema
   */
  router.post(
    {
      path: '/api/ml/validate/job',
      validate: {
        body: validateJobSchema,
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        // version corresponds to the version used in documentation links.
        const resp = await validateJob(
          context.ml!.mlClient,
          request.body,
          version,
          mlLicense.isSecurityEnabled() === false
        );

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
