/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { InfraBackendLibs } from '../../../lib/infra_types';
import {
  LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
  getLogEntryRateRequestPayloadRT,
  getLogEntryRateSuccessReponsePayloadRT,
  GetLogEntryRateSuccessResponsePayload,
} from '../../../../common/http_api/log_analysis';
import { createValidationFunction } from '../../../../common/runtime_types';
import { NoLogAnalysisResultsIndexError, getLogEntryRateBuckets } from '../../../lib/log_analysis';
import { assertHasInfraMlPlugins } from '../../../utils/request_context';

export const initGetLogEntryRateRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
      validate: {
        body: createValidationFunction(getLogEntryRateRequestPayloadRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const {
        data: { sourceId, timeRange, bucketDuration, datasets },
      } = request.body;

      try {
        assertHasInfraMlPlugins(requestContext);

        const logEntryRateBuckets = await getLogEntryRateBuckets(
          requestContext,
          sourceId,
          timeRange.startTime,
          timeRange.endTime,
          bucketDuration,
          datasets
        );

        return response.ok({
          body: getLogEntryRateSuccessReponsePayloadRT.encode({
            data: {
              bucketDuration,
              histogramBuckets: logEntryRateBuckets,
              totalNumberOfLogEntries: getTotalNumberOfLogEntries(logEntryRateBuckets),
            },
          }),
        });
      } catch (error) {
        if (Boom.isBoom(error)) {
          throw error;
        }

        if (error instanceof NoLogAnalysisResultsIndexError) {
          return response.notFound({ body: { message: error.message } });
        }

        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    })
  );
};

const getTotalNumberOfLogEntries = (
  logEntryRateBuckets: GetLogEntryRateSuccessResponsePayload['data']['histogramBuckets']
) => {
  return logEntryRateBuckets.reduce((sumNumberOfLogEntries, bucket) => {
    const sumPartitions = bucket.partitions.reduce((partitionsTotal, partition) => {
      return (partitionsTotal += partition.numberOfLogEntries);
    }, 0);
    return (sumNumberOfLogEntries += sumPartitions);
  }, 0);
};
