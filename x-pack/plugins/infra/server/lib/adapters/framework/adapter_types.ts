/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Lifecycle } from '@hapi/hapi';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { JsonArray, JsonValue } from '@kbn/utility-types';
import { RouteConfig, RouteMethod } from '../../../../../../../src/core/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '../../../../../../../src/plugins/data/server';
import { HomeServerPluginSetup } from '../../../../../../../src/plugins/home/server';
import { VisTypeTimeseriesSetup } from '../../../../../../../src/plugins/vis_types/timeseries/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../../../../plugins/features/server';
import { SpacesPluginSetup } from '../../../../../../plugins/spaces/server';
import { PluginSetupContract as AlertingPluginContract } from '../../../../../alerting/server';
import { MlPluginSetup } from '../../../../../ml/server';
import { RuleRegistryPluginSetupContract } from '../../../../../rule_registry/server';

export interface InfraServerPluginSetupDeps {
  data: DataPluginSetup;
  home: HomeServerPluginSetup;
  spaces: SpacesPluginSetup;
  usageCollection: UsageCollectionSetup;
  visTypeTimeseries: VisTypeTimeseriesSetup;
  features: FeaturesPluginSetup;
  alerting: AlertingPluginContract;
  ruleRegistry: RuleRegistryPluginSetupContract;
  ml?: MlPluginSetup;
}

export interface InfraServerPluginStartDeps {
  data: DataPluginStart;
}

export interface CallWithRequestParams extends estypes.RequestBase {
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
  track_total_hits?: boolean | number;
  body?: any;
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
  timed_out: boolean;
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

export type SearchHit = estypes.SearchHit;

export interface SortedSearchHit extends SearchHit {
  sort: any[];
  _source: {
    [field: string]: JsonValue;
  };
  fields: {
    [field: string]: JsonArray;
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

export type InfraRouteConfig<Params, Query, Body, Method extends RouteMethod> = {
  method: RouteMethod;
} & RouteConfig<Params, Query, Body, Method>;
