/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';
import { Inspect, Maybe, TimerangeInput } from '../../common';
import { AuthenticationHit, RequestBasicOptions } from '../';
import { AlertsGroupData } from './alerts';
import { AnomaliesActionGroupData, AnomalyHit } from './anomalies';
import { DnsHistogramGroupData } from './dns';
import { AuthenticationsActionGroupData } from './authentications';
import { EventsActionGroupData, EventHit } from './events';
import { PreviewHistogramGroupData } from './preview';

export * from './alerts';
export * from './anomalies';
export * from './authentications';
export * from './common';
export * from './dns';
export * from './events';
export * from './preview';

export const MatrixHistogramQuery = 'matrixHistogram';

export enum MatrixHistogramType {
  authentications = 'authentications',
  anomalies = 'anomalies',
  events = 'events',
  alerts = 'alerts',
  dns = 'dns',
  preview = 'preview',
}

export const MatrixHistogramTypeToAggName = {
  [MatrixHistogramType.alerts]: 'aggregations.alertsGroup.buckets',
  [MatrixHistogramType.anomalies]: 'aggregations.anomalyActionGroup.buckets',
  [MatrixHistogramType.authentications]: 'aggregations.eventActionGroup.buckets',
  [MatrixHistogramType.dns]: 'aggregations.dns_name_query_count.buckets',
  [MatrixHistogramType.events]: 'aggregations.eventActionGroup.buckets',
  [MatrixHistogramType.preview]: 'aggregations.preview.buckets',
};

export interface MatrixHistogramRequestOptions extends RequestBasicOptions {
  timerange: TimerangeInput;
  histogramType: MatrixHistogramType;
  stackByField: string;
  threshold?:
    | {
        field: string[];
        value: string;
        cardinality?: {
          field: string[];
          value: string;
        };
      }
    | undefined;
  inspect?: Maybe<Inspect>;
  isPtrIncluded?: boolean;
  includeMissingData?: boolean;
  runtimeMappings?: MappingRuntimeFields;
}

export interface MatrixHistogramStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  matrixHistogramData: MatrixHistogramData[];
  totalCount: number;
}

export interface MatrixHistogramData {
  x?: Maybe<number>;
  y?: Maybe<number>;
  g?: Maybe<string>;
}

export interface MatrixHistogramBucket {
  key: number;
  doc_count: number;
}

export interface MatrixHistogramSchema<T> {
  buildDsl: (options: MatrixHistogramRequestOptions) => {};
  aggName: string;
  parseKey: string;
  parser?: <U>(data: MatrixHistogramParseData<U>, keyBucket: string) => MatrixHistogramData[];
}

export type MatrixHistogramParseData<T> = T extends MatrixHistogramType.alerts
  ? AlertsGroupData[]
  : T extends MatrixHistogramType.anomalies
  ? AnomaliesActionGroupData[]
  : T extends MatrixHistogramType.dns
  ? DnsHistogramGroupData[]
  : T extends MatrixHistogramType.authentications
  ? AuthenticationsActionGroupData[]
  : T extends MatrixHistogramType.events
  ? EventsActionGroupData[]
  : T extends MatrixHistogramType.preview
  ? PreviewHistogramGroupData[]
  : never;

export type MatrixHistogramHit<T> = T extends
  | MatrixHistogramType.alerts
  | MatrixHistogramType.dns
  | MatrixHistogramType.events
  | MatrixHistogramType.preview
  ? EventHit
  : T extends MatrixHistogramType.anomalies
  ? AnomalyHit
  : T extends MatrixHistogramType.authentications
  ? AuthenticationHit
  : never;

export type MatrixHistogramDataConfig = Record<
  MatrixHistogramType,
  MatrixHistogramSchema<MatrixHistogramType>
>;
