/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PromiseReturnType,
  IndexAsString,
  Omit
} from '../../../typings/common';
import { ChartType, YUnit } from '../../../typings/timeseries';
import { fetch as cpuFetch } from './by_agent/shared/cpu/fetcher';

type CpuSearchResponse = PromiseReturnType<typeof cpuFetch>;

export type MetricSearchResponse<MetricNames extends string> = Omit<
  CpuSearchResponse,
  'aggregations'
> & {
  aggregations: IndexAsString<
    { [key in MetricNames]: { value: number } } & {
      timeseriesData: {
        buckets: Array<
          {
            key: number;
            doc_count: number;
          } & { [key in MetricNames]: { value: number } }
        >;
      };
    }
  >;
};

export interface ChartBase {
  title: string;
  key: string;
  type: ChartType;
  yUnit: YUnit;
  series: IndexAsString<{
    [key: string]: {
      title: string;
      color?: string;
    };
  }>;
}
