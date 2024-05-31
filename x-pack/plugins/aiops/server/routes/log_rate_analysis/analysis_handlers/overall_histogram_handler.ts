/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import {
  fetchHistogramsForFields,
  type NumericChartData,
  type NumericHistogramField,
} from '@kbn/ml-agg-utils';
import { RANDOM_SAMPLER_SEED } from '@kbn/aiops-log-rate-analysis/constants';
import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '@kbn/aiops-log-rate-analysis/api/schema';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';

import { getHistogramQuery } from '@kbn/aiops-log-rate-analysis/queries/get_histogram_query';

import type { ResponseStreamFetchOptions } from '../response_stream_factory';

export const overallHistogramHandlerFactory =
  <T extends ApiVersion>({
    abortSignal,
    client,
    requestBody,
    logDebugMessage,
    logger,
    responseStream,
    stateHandler,
  }: ResponseStreamFetchOptions<T>) =>
  async () => {
    const histogramFields: [NumericHistogramField] = [
      { fieldName: requestBody.timeFieldName, type: KBN_FIELD_TYPES.DATE },
    ];

    logDebugMessage('Fetch overall histogram.');

    let overallTimeSeries: NumericChartData | undefined;

    const overallHistogramQuery = getHistogramQuery(requestBody);

    try {
      overallTimeSeries = (
        (await fetchHistogramsForFields(
          client,
          requestBody.index,
          overallHistogramQuery,
          // fields
          histogramFields,
          // samplerShardSize
          -1,
          undefined,
          abortSignal,
          stateHandler.sampleProbability(),
          RANDOM_SAMPLER_SEED
        )) as [NumericChartData]
      )[0];
    } catch (e) {
      if (!isRequestAbortedError(e)) {
        logger.error(`Failed to fetch the overall histogram data, got: \n${e.toString()}`);
        responseStream.pushError(`Failed to fetch overall histogram data.`);
      }
      // Still continue the analysis even if loading the overall histogram fails.
    }

    if (stateHandler.shouldStop()) {
      logDebugMessage('shouldStop after fetching overall histogram.');
      responseStream.end();
      return;
    }

    return overallTimeSeries;
  };
