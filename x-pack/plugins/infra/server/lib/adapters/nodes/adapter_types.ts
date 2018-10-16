/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraMetricInput,
  InfraNode,
  InfraPathFilterInput,
  InfraPathInput,
  InfraPathType,
  InfraTimerangeInput,
} from '../../../../common/graphql/types';
import { JsonObject } from '../../../../common/typed_json';
import { InfraSourceConfiguration } from '../../sources';
import { InfraFrameworkRequest } from '../framework';

export interface InfraNodesAdapter {
  getNodes(req: InfraFrameworkRequest, options: InfraNodeRequestOptions): Promise<InfraNode[]>;
}

export interface InfraHostsFieldsObject {
  name?: any;
  metrics?: any;
  groups?: [any];
}

export type InfraESQuery =
  | InfraESBoolQuery
  | InfraESRangeQuery
  | InfraESExistsQuery
  | InfraESQueryStringQuery
  | InfraESMatchQuery
  | JsonObject;

export interface InfraESExistsQuery {
  exists: { field: string };
}

export interface InfraESQueryStringQuery {
  query_string: {
    query: string;
    analyze_wildcard: boolean;
  };
}

export interface InfraESRangeQuery {
  range: {
    [name: string]: {
      gte: number;
      lte: number;
      format: string;
    };
  };
}

export interface InfraESMatchQuery {
  match: {
    [name: string]: {
      query: string;
    };
  };
}

export interface InfraESBoolQuery {
  bool: {
    must?: InfraESQuery[];
    should?: InfraESQuery[];
    filter?: InfraESQuery[];
  };
}

export interface InfraESMSearchHeader {
  index: string[] | string;
}

export interface InfraESSearchBody {
  query?: object;
  aggregations?: object;
  aggs?: object;
  size?: number;
}

export type InfraESMSearchBody = InfraESSearchBody | InfraESMSearchHeader;

export interface InfraNodeRequestOptions {
  nodeType: InfraNodeType;
  sourceConfiguration: InfraSourceConfiguration;
  timerange: InfraTimerangeInput;
  groupBy: InfraPathInput[];
  metric: InfraMetricInput;
  filterQuery: InfraESQuery | undefined;
}

export enum InfraNodesKey {
  hosts = 'hosts',
  pods = 'pods',
  containers = 'containers',
}

export enum InfraNodeType {
  host = 'host',
  pod = 'pod',
  container = 'container',
}

export interface InfraNodesAggregations {
  waffle: {
    nodes: {
      buckets: InfraBucket[];
    };
  };
}

export type InfraProcessorTransformer<T> = (doc: T) => T;

export type InfraProcessorChainFn<T> = (
  next: InfraProcessorTransformer<T>
) => InfraProcessorTransformer<T>;

export type InfraProcessor<O, T> = (options: O) => InfraProcessorChainFn<T>;

export interface InfraProcesorRequestOptions {
  nodeType: InfraNodeType;
  nodeOptions: InfraNodeRequestOptions;
  partitionId: number;
  numberOfPartitions: number;
  nodeField: string;
}

export interface InfraGroupByFilters {
  id: string /** The UUID for the group by object */;
  type: InfraPathType /** The type of aggregation to use to bucket the groups */;
  label?:
    | string
    | null /** The label to use in the results for the group by for the terms group by */;
  filters: InfraPathFilterInput[] /** The filters to use for the group by aggregation, this is ignored by the terms group by */;
}

export interface InfraGroupByTerms {
  id: string /** The UUID for the group by object */;
  type: InfraPathType /** The type of aggregation to use to bucket the groups */;
  label?:
    | string
    | null /** The label to use in the results for the group by for the terms group by */;
  field: string;
}

export interface InfraBucketWithKey {
  key: string | number;
  doc_count: number;
}

export interface InfraBucketWithAggs {
  [name: string]: {
    buckets: InfraBucket[];
  };
}

export interface InfraBucketWithValues {
  [name: string]: { value: number; normalized_value?: number };
}

export type InfraBucket = InfraBucketWithAggs & InfraBucketWithKey & InfraBucketWithValues;

export interface InfraGroupWithNodes {
  name: string;
  nodes: InfraNode[];
}

export interface InfraGroupWithSubGroups {
  name: string;
  groups: InfraGroupWithNodes[];
}

export type InfraNodeGroup = InfraGroupWithNodes | InfraGroupWithSubGroups;

export interface InfraNodesResponse {
  total?: number;
}

export interface InfraGroupsResponse {
  total: number;
  groups: InfraNodeGroup[];
}

export interface InfraNodesOnlyResponse {
  total: number;
  nodes: InfraNode[];
}

export interface InfraAvgAgg {
  avg: { field: string };
}

export interface InfraMaxAgg {
  max: { field: string };
}

export interface InfraDerivativeAgg {
  derivative: {
    buckets_path: string;
    gap_policy: string;
    unit: string;
  };
}

export interface InfraCumulativeSumAgg {
  cumulative_sum: {
    buckets_path: string;
  };
}

export interface InfraBucketScriptAgg {
  bucket_script: {
    buckets_path: { [key: string]: string };
    script: {
      source: string;
      lang: string;
    };
    gap_policy: string;
  };
}

export type InfraAgg =
  | InfraBucketScriptAgg
  | InfraDerivativeAgg
  | InfraAvgAgg
  | InfraMaxAgg
  | InfraCumulativeSumAgg;
export interface InfraNodeMetricAgg {
  [key: string]: InfraAgg;
}

export type InfraNodeMetricFn = (nodeType: InfraNodeType) => InfraNodeMetricAgg | undefined;
