/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termsQuery } from '../../../../observability/server';
import { PARENT_ID, TRACE_ID } from '../../../common/elasticsearch_fieldnames';
import {
  getTraceSamples,
  TraceSample,
} from '../../routes/transactions/trace_samples/get_trace_samples';
import { TraceMetricFetcher } from './trace_metric_fetcher';

export type TraceSamplesResponse = TraceSample[];

export const traceSamplesFetcher: TraceMetricFetcher<TraceSamplesResponse> =
  async ({ start, end, environment, apmEventClient, traceIds, prev = [] }) => {
    const nextSamples = (
      await getTraceSamples({
        start,
        end,
        environment,
        filters: [
          {
            bool: {
              must_not: [
                {
                  exists: {
                    field: PARENT_ID,
                  },
                },
              ],
            },
          },
          ...termsQuery(TRACE_ID, ...traceIds),
        ],
        apmEventClient,
        kuery: '',
      })
    ).traceSamples;

    return prev.concat(nextSamples).slice(0, 500);
  };
