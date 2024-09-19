/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';
import { AuthenticationHit } from '../hosts';
import { Inspect, Maybe, TimerangeInput } from '../../common';
import { RequestBasicOptions } from '../';
import { AlertsGroupData } from './alerts';
import { AnomaliesActionGroupData, AnomalyHit } from './anomalies';
import { DnsHistogramGroupData } from './dns';
import { AuthenticationsActionGroupData } from './authentications';
import { EventsActionGroupData, EventHit } from './events';

export * from './alerts';
export * from './anomalies';
export * from './authentications';
export * from './common';
export * from './dns';
export * from './events';

export const MatrixHistogramQuery = 'matrixHistogram';
export const MatrixHistogramQueryEntities = 'matrixHistogramEntities';

export enum MatrixHistogramType {
  authentications = 'authentications',
  authenticationsEntities = 'authenticationsEntities',
  anomalies = 'anomalies',
  events = 'events',
  alerts = 'alerts',
  dns = 'dns',
}

export const MatrixHistogramTypeToAggName = {
  [MatrixHistogramType.alerts]: 'aggregations.alertsGroup.buckets',
  [MatrixHistogramType.anomalies]: 'aggregations.anomalyActionGroup.buckets',
  [MatrixHistogramType.authentications]: 'aggregations.eventActionGroup.buckets',
  [MatrixHistogramType.authenticationsEntities]: 'aggregations.events.buckets',
  [MatrixHistogramType.dns]: 'aggregations.dns_name_query_count.buckets',
  [MatrixHistogramType.events]: 'aggregations.eventActionGroup.buckets',
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
  : never;

export type MatrixHistogramHit<T> = T extends MatrixHistogramType.alerts
  ? EventHit
  : T extends MatrixHistogramType.anomalies
  ? AnomalyHit
  : T extends MatrixHistogramType.dns
  ? EventHit
  : T extends MatrixHistogramType.authentications
  ? AuthenticationHit
  : T extends MatrixHistogramType.events
  ? EventHit
  : never;

export type MatrixHistogramDataConfig = Record<
  MatrixHistogramType,
  MatrixHistogramSchema<MatrixHistogramType>
>;
