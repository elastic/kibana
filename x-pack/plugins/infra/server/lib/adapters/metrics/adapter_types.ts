/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import {
  NodeDetailsRequest,
  NodeDetailsMetricData,
} from '../../../../common/http_api/node_details_api';
import { InventoryMetric } from '../../../../common/inventory_models/types';
import { InfraSourceConfiguration } from '../../sources';

export interface InfraMetricsRequestOptions
  extends Omit<NodeDetailsRequest, 'sourceId' | 'nodeId' | 'cloudId'> {
  nodeIds: {
    nodeId: string;
    cloudId?: string | null;
  };
  sourceConfiguration: InfraSourceConfiguration;
}

export interface InfraMetricsAdapter {
  getMetrics(
    requestContext: InfraPluginRequestHandlerContext,
    options: InfraMetricsRequestOptions,
    request: KibanaRequest
  ): Promise<NodeDetailsMetricData[]>;
}

export enum InfraMetricModelQueryType {
  lucene = 'lucene',
  kuery = 'kuery',
}

export enum InfraMetricModelMetricType {
  avg = 'avg',
  max = 'max',
  min = 'min',
  calculation = 'calculation',
  cardinality = 'cardinality',
  series_agg = 'series_agg',
  positive_only = 'positive_only',
  derivative = 'derivative',
  count = 'count',
  sum = 'sum',
  cumulative_sum = 'cumulative_sum',
}

export interface InfraMetricModel {
  id: InventoryMetric;
  requires: string[];
  index_pattern: string | string[];
  interval: string;
  time_field: string;
  type: string;
  series: InfraMetricModelSeries[];
  filter?: string;
  map_field_to?: string;
  id_type?: 'cloud' | 'node';
}

export interface InfraMetricModelSeries {
  id: string;
  metrics: InfraMetricModelMetric[];
  split_mode: string;
  terms_field?: string;
  terms_size?: number;
  terms_order_by?: string;
  filter?: { query: string; language: InfraMetricModelQueryType };
}

export interface InfraMetricModelBasicMetric {
  id: string;
  field?: string | null;
  type: InfraMetricModelMetricType;
}

export interface InfraMetricModelSeriesAgg {
  id: string;
  function: string;
  type: InfraMetricModelMetricType.series_agg;
}

export interface InfraMetricModelDerivative {
  id: string;
  field: string;
  unit: string;
  type: InfraMetricModelMetricType;
}

export interface InfraMetricModelBucketScriptVariable {
  field: string;
  id: string;
  name: string;
}

export interface InfraMetricModelCount {
  id: string;
  type: InfraMetricModelMetricType.count;
}

export interface InfraMetricModelBucketScript {
  id: string;
  script: string;
  type: InfraMetricModelMetricType.calculation;
  variables: InfraMetricModelBucketScriptVariable[];
}

export type InfraMetricModelMetric =
  | InfraMetricModelCount
  | InfraMetricModelBasicMetric
  | InfraMetricModelBucketScript
  | InfraMetricModelDerivative
  | InfraMetricModelSeriesAgg;

export type InfraMetricModelCreator = (
  timeField: string,
  indexPattern: string | string[],
  interval: string
) => InfraMetricModel;
