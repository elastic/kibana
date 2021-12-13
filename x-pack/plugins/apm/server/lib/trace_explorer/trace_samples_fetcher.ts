/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
        traceIds,
        apmEventClient,
        kuery: '',
      })
    ).traceSamples;

    return prev.concat(nextSamples).slice(0, 500);
  };
