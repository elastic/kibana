/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  MatrixHistogramOverTimeData,
  HistogramType,
  MatrixOverTimeHistogramData,
} from '../../graphql/types';
import { FrameworkRequest, MatrixHistogramRequestOptions } from '../framework';
import { SearchHit } from '../types';
import { EventHit } from '../events/types';
import { AuthenticationHit } from '../authentications/types';

export interface HistogramBucket {
  key: number;
  doc_count: number;
}

interface AlertsGroupData {
  key: string;
  doc_count: number;
  alerts: {
    buckets: HistogramBucket[];
  };
}

interface AnomaliesOverTimeHistogramData {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface AnomaliesActionGroupData {
  key: number;
  anomalies: {
    bucket: AnomaliesOverTimeHistogramData[];
  };
  doc_count: number;
}

export interface AnomalySource {
  [field: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface AnomalyHit extends SearchHit {
  sort: string[];
  _source: AnomalySource;
  aggregations: {
    [agg: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
}

interface EventsOverTimeHistogramData {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface EventsActionGroupData {
  key: number;
  events: {
    bucket: EventsOverTimeHistogramData[];
  };
  doc_count: number;
}

export interface DnsHistogramSubBucket {
  key: string;
  doc_count: number;
  orderAgg: {
    value: number;
  };
}
interface DnsHistogramBucket {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: DnsHistogramSubBucket[];
}

export interface DnsHistogramGroupData {
  key: number;
  doc_count: number;
  key_as_string: string;
  histogram: DnsHistogramBucket;
}

export interface MatrixHistogramSchema<T> {
  buildDsl: (options: MatrixHistogramRequestOptions) => {};
  aggName: string;
  parseKey: string;
  parser?: <T>(
    data: MatrixHistogramParseData<T>,
    keyBucket: string
  ) => MatrixOverTimeHistogramData[];
}

export type MatrixHistogramParseData<T> = T extends HistogramType.alerts
  ? AlertsGroupData[]
  : T extends HistogramType.anomalies
  ? AnomaliesActionGroupData[]
  : T extends HistogramType.dns
  ? DnsHistogramGroupData[]
  : T extends HistogramType.authentications
  ? AuthenticationsActionGroupData[]
  : T extends HistogramType.events
  ? EventsActionGroupData[]
  : never;

export type MatrixHistogramHit<T> = T extends HistogramType.alerts
  ? EventHit
  : T extends HistogramType.anomalies
  ? AnomalyHit
  : T extends HistogramType.dns
  ? EventHit
  : T extends HistogramType.authentications
  ? AuthenticationHit
  : T extends HistogramType.events
  ? EventHit
  : never;

export type MatrixHistogramDataConfig = Record<HistogramType, MatrixHistogramSchema<HistogramType>>;
interface AuthenticationsOverTimeHistogramData {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface AuthenticationsActionGroupData {
  key: number;
  events: {
    bucket: AuthenticationsOverTimeHistogramData[];
  };
  doc_count: number;
}

export interface MatrixHistogramAdapter {
  getHistogramData(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData>;
}
