/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GenericParams, SearchResponse } from 'elasticsearch';
import { Lifecycle } from 'hapi';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { RouteConfig, RouteMethod } from '../../../../../../../src/core/server';
import { HomeServerPluginSetup } from '../../../../../../../src/plugins/home/server';
import { VisTypeTimeseriesSetup } from '../../../../../../../src/plugins/vis_type_timeseries/server';
import { APMPluginSetup } from '../../../../../../plugins/apm/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../../../../plugins/features/server';
import { SpacesPluginSetup } from '../../../../../../plugins/spaces/server';
import { PluginSetupContract as AlertingPluginContract } from '../../../../../alerts/server';
import { MlPluginSetup } from '../../../../../ml/server';

export interface InfraServerPluginDeps {
  home: HomeServerPluginSetup;
  spaces: SpacesPluginSetup;
  usageCollection: UsageCollectionSetup;
  visTypeTimeseries: VisTypeTimeseriesSetup;
  features: FeaturesPluginSetup;
  apm: APMPluginSetup;
  alerts: AlertingPluginContract;
  ml?: MlPluginSetup;
}

export interface CallWithRequestParams extends GenericParams {
  max_concurrent_shard_requests?: number;
  name?: string;
  index?: string | string[];
  ignore_unavailable?: boolean;
  allow_no_indices?: boolean;
  size?: number;
  terminate_after?: number;
  fields?: string | string[];
  path?: string;
  query?: string | object;
}

export type InfraResponse = Lifecycle.ReturnValue;

export interface InfraFrameworkPluginOptions {
  register: any;
  options: any;
}

export interface InfraDatabaseResponse {
  took: number;
  timeout: boolean;
}

export interface InfraDatabaseSearchResponse<Hit = {}, Aggregations = undefined>
  extends InfraDatabaseResponse {
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  aggregations?: Aggregations;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: Hit[];
  };
}

export interface InfraDatabaseMultiResponse<Hit, Aggregation> extends InfraDatabaseResponse {
  responses: Array<InfraDatabaseSearchResponse<Hit, Aggregation>>;
}

export interface InfraDatabaseFieldCapsResponse extends InfraDatabaseResponse {
  indices: string[];
  fields: InfraFieldsResponse;
}

export interface InfraDatabaseGetIndicesAliasResponse {
  [indexName: string]: {
    aliases: {
      [aliasName: string]: any;
    };
  };
}

export interface InfraDatabaseGetIndicesResponse {
  [indexName: string]: {
    aliases: {
      [aliasName: string]: any;
    };
    mappings: {
      _meta: object;
      dynamic_templates: any[];
      date_detection: boolean;
      properties: {
        [fieldName: string]: any;
      };
    };
    settings: { index: object };
  };
}

export type SearchHit = SearchResponse<object>['hits']['hits'][0];

export interface SortedSearchHit extends SearchHit {
  sort: any[];
  _source: {
    [field: string]: any;
  };
}

export type InfraDateRangeAggregationBucket<NestedAggregation extends object = {}> = {
  from?: number;
  to?: number;
  doc_count: number;
  key: string;
} & NestedAggregation;

export interface InfraDateRangeAggregationResponse<NestedAggregation extends object = {}> {
  buckets: Array<InfraDateRangeAggregationBucket<NestedAggregation>>;
}

export interface InfraTopHitsAggregationResponse {
  hits: {
    hits: [];
  };
}

export interface InfraMetadataAggregationBucket {
  key: string;
}

export interface InfraMetadataAggregationResponse {
  buckets: InfraMetadataAggregationBucket[];
}

export interface InfraFieldsResponse {
  [name: string]: InfraFieldDef;
}

export interface InfraFieldDetails {
  searchable: boolean;
  aggregatable: boolean;
  type: string;
}

export interface InfraFieldDef {
  [type: string]: InfraFieldDetails;
}

export interface InfraTSVBResponse {
  [key: string]: InfraTSVBPanel;
}

export interface InfraTSVBPanel {
  id: string;
  series: InfraTSVBSeries[];
}

export interface InfraTSVBSeries {
  id: string;
  label: string;
  data: InfraTSVBDataPoint[];
}

export type InfraTSVBDataPoint = [number, number];

export type InfraRouteConfig<params, query, body, method extends RouteMethod> = {
  method: RouteMethod;
} & RouteConfig<params, query, body, method>;
