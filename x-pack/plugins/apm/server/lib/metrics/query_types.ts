/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../helpers/setup_request';
import { ChartType, YUnit } from '../../../typings/common';
import { Coordinate } from '../../../typings/timeseries';

export interface MetricsRequestArgs {
  serviceName: string;
  setup: Setup;
}

export interface AggValue {
  value: number | null;
}

export interface TimeSeriesBucket {
  key_as_string: string; // timestamp as string
  key: number; // timestamp as epoch milliseconds
  doc_count: number;
}

export interface MetricsKeys {
  [key: string]: AggValue;
}

type SeriesTitleMap<T extends MetricsKeys> = { [key in keyof T]: string };

export interface ChartBase<T extends MetricsKeys> {
  title: string;
  key: string;
  type: ChartType;
  yUnit: YUnit;
  series: SeriesTitleMap<T>;
}

export interface Chart<T extends MetricsKeys> {
  title: ChartBase<T>['title'];
  key: ChartBase<T>['key'];
  type: ChartBase<T>['type'];
  yUnit: ChartBase<T>['yUnit'];
  totalHits: number;
  series: Array<ChartSeries<T>>;
}

export interface ChartSeries<T extends MetricsKeys> {
  title: string;
  key: keyof T;
  overallValue: number | null;
  data: Coordinate[];
}

export type MetricsAggs<T extends MetricsKeys> = {
  timeseriesData: {
    buckets: Array<TimeSeriesBucket & T>;
  };
} & T;
