/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraMetric,
  InfraMetricData,
  InfraNodeType,
  InfraTimerangeInput,
} from '../../../../common/graphql/types';

import { InfraSourceConfiguration } from '../../sources';
import { InfraFrameworkRequest } from '../framework';

export interface InfraMetricsRequestOptions {
  nodeId: string;
  nodeType: InfraNodeType;
  sourceConfiguration: InfraSourceConfiguration;
  timerange: InfraTimerangeInput;
  metrics: InfraMetric[];
}

export interface InfraMetricsAdapter {
  getMetrics(
    req: InfraFrameworkRequest,
    options: InfraMetricsRequestOptions
  ): Promise<InfraMetricData[]>;
}

export enum InfraMetricModelMetricType {
  avg = 'avg',
  max = 'max',
  min = 'min',
  calculation = 'calculation',
}

export interface InfraMetricModel {
  id: string;
  requires: string;
  index_pattern: string;
  interval: string;
  time_field: string;
  type: string;
  series: InfraMetricModelSeries[];
  filter?: string;
}

export interface InfraMetricModelSeries {
  id: string;
  metrics: InfraMetricModelMetric[];
  split_mode: string;
  terms_field?: string;
  terms_size?: number;
  terms_order_by?: string;
}

export interface InfraMetricModelBasicMetric {
  id: string;
  field: string;
  type: InfraMetricModelMetricType;
}

export interface InfraMetricModelBucketScriptVariable {
  field: string;
  id: string;
  name: string;
}

export interface InfraMetricModelBucketScript {
  id: string;
  script: string;
  type: InfraMetricModelMetricType.calculation;
  variables: InfraMetricModelBucketScriptVariable[];
}

export type InfraMetricModelMetric = InfraMetricModelBasicMetric | InfraMetricModelBucketScript;

export type InfraMetricModelCreator = (
  timeField: string,
  indexPattern: string,
  interval: string
) => InfraMetricModel;
