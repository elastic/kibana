/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChartType, YUnit } from '../../../typings/timeseries';

export interface AggValue {
  value: number | null;
}

export interface MetricsKeys {
  [key: string]: AggValue;
}

export interface ChartBase<T extends MetricsKeys> {
  title: string;
  key: string;
  type: ChartType;
  yUnit: YUnit;
  series: {
    [key in keyof T]: {
      title: string;
      color?: string;
    }
  };
}

export type MetricsAggs<T extends MetricsKeys> = {
  timeseriesData: {
    buckets: Array<
      {
        key_as_string: string; // timestamp as string
        key: number; // timestamp as epoch milliseconds
        doc_count: number;
      } & T
    >;
  };
} & T;
