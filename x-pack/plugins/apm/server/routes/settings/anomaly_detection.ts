/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { ErrorCode } from '../../../common/anomaly_detection';
import { PromiseReturnType } from '../../../typings/common';
import { InsufficientMLCapabilities } from '../../../../ml/server';
import { createRoute } from '../create_route';
import { getAnomalyDetectionJobs } from '../../lib/anomaly_detection/get_anomaly_detection_jobs';
import { createAnomalyDetectionJobs } from '../../lib/anomaly_detection/create_anomaly_detection_jobs';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getAllEnvironments } from '../../lib/environments/get_all_environments';
import { hasLegacyJobs } from '../../lib/anomaly_detection/has_legacy_jobs';
import { AnomalyDetectionError } from '../../lib/anomaly_detection/anomaly_detection_error';

type Jobs = PromiseReturnType<typeof getAnomalyDetectionJobs>;

// get ML anomaly detection jobs for each environment
export const anomalyDetectionJobsRoute = createRoute(() => ({
  method: 'GET',
  path: '/api/apm/settings/anomaly-detection',
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    try {
      const [jobs, legacyJobs] = await Promise.all([
        getAnomalyDetectionJobs(setup, context.logger),
        hasLegacyJobs(setup),
      ]);
      return {
        jobs,
        hasLegacyJobs: legacyJobs,
      };
    } catch (e) {
      // ML error
      if (e instanceof InsufficientMLCapabilities) {
        return {
          jobs: [] as Jobs,
          hasLegacyJobs: false,
          errorCode: ErrorCode.MISSING_READ_PRIVILEGES,
        };
      }

      // AnomalyDetectionError error
      if (e instanceof AnomalyDetectionError) {
        return {
          jobs: [] as Jobs,
          hasLegacyJobs: false,
          errorCode: e.code,
        };
      }

      // unexpected error
      context.logger.warn(e.message);
      return {
        jobs: [] as Jobs,
        hasLegacyJobs: false,
        errorCode: ErrorCode.UNEXPECTED,
      };
    }
  },
}));

// create new ML anomaly detection jobs for each given environment
export const createAnomalyDetectionJobsRoute = createRoute(() => ({
  method: 'POST',
  path: '/api/apm/settings/anomaly-detection/jobs',
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  params: {
    body: t.type({
      environments: t.array(t.string),
    }),
  },
  handler: async ({ context, request }) => {
    const { environments } = context.params.body;
    const setup = await setupRequest(context, request);

    try {
      await createAnomalyDetectionJobs(setup, environments, context.logger);
    } catch (e) {
      // InsufficientMLCapabilities
      if (e instanceof InsufficientMLCapabilities) {
        return {
          errorCode: ErrorCode.MISSING_READ_PRIVILEGES,
        };
      }

      // AnomalyDetectionError
      if (e instanceof AnomalyDetectionError) {
        return {
          errorCode: e.code,
        };
      }

      // unexpected error
      context.logger.warn(e.message);
      return {
        errorCode: ErrorCode.UNEXPECTED,
      };
    }
  },
}));

// get all available environments to create anomaly detection jobs for
export const anomalyDetectionEnvironmentsRoute = createRoute(() => ({
  method: 'GET',
  path: '/api/apm/settings/anomaly-detection/environments',
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    return await getAllEnvironments({ setup, includeMissing: true });
  },
}));
