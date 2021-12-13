/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TraceSearchType } from '.';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TraceDistributionResponse } from '../../server/lib/trace_explorer/trace_distribution_fetcher';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TraceSamplesResponse } from '../../server/lib/trace_explorer/trace_samples_fetcher';
import { Environment } from '../environment_rt';

interface TraceSearchFragmentSearch<T> {
  isRunning: boolean;
  isPartial: boolean;
  isError: boolean;
  error: string | undefined;
  data: T | undefined;
  pageIndex: number;
}

export interface TraceSearchParams {
  type: TraceSearchType;
  query: string;
  environment: Environment;
  start: number;
  end: number;
  pageSize: number;
}

export interface TraceSearchState {
  params: TraceSearchParams;
  apiKey: string;
  isRunning: boolean;
  isPartial: boolean;
  isError: boolean;
  error: string | undefined;
  pagination: {
    after: string | null;
    pageIndex: number;
  };
  fragments: {
    distribution: TraceSearchFragmentSearch<TraceDistributionResponse>;
    samples: TraceSearchFragmentSearch<TraceSamplesResponse>;
  };
}
