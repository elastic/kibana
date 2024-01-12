/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Query } from '@kbn/data-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { TimeRange } from '@kbn/es-query';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import { MapExtent } from './map_descriptor';

export type Timeslice = {
  from: number;
  to: number;
};

// Global map state passed to every layer.
export type DataFilters = {
  buffer?: MapExtent; // extent with additional buffer
  extent?: MapExtent; // map viewport
  filters: Filter[]; // search bar filters
  query?: Query; // search bar query
  embeddableSearchContext?: {
    query?: Query;
    filters: Filter[];
  };
  searchSessionId?: string;
  timeFilters: TimeRange;
  timeslice?: Timeslice;
  zoom: number;
  isReadOnly: boolean;
  joinKeyFilter?: Filter;
  executionContext: KibanaExecutionContext;
};

export type SourceRequestMeta = DataFilters & {
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
  applyForceRefresh: boolean;
  sourceQuery?: Query;
  isForceRefresh: boolean;
};

export type VectorSourceRequestMeta = SourceRequestMeta & {
  /*
   * List of feature property keys used in client for data driven styling, join keys, and feature masking
   */
  fieldNames: string[];
  timesliceMaskField?: string;
  sourceMeta: object | null;
  isFeatureEditorOpenForLayer: boolean;
};

export type VectorStyleRequestMeta = DataFilters & {
  dynamicStyleFields: string[];
  isTimeAware: boolean;
  sourceQuery: Query;
  timeFilters: TimeRange;
};

export type ESSearchSourceResponseMeta = {
  areResultsTrimmed?: boolean;
  resultsCount?: number;
  // results time extent, either Kibana time range or timeslider time slice
  timeExtent?: Timeslice;
  isTimeExtentForTimeslice?: boolean;

  // top hits meta
  areEntitiesTrimmed?: boolean;
  entityCount?: number;
  totalEntities?: number;
};

export type ESGeoLineSourceResponseMeta = {
  areResultsTrimmed: boolean;
  areEntitiesTrimmed: boolean;
  entityCount: number;
  numTrimmedTracks: number;
  totalEntities: number;
};

export type VectorTileLayerMeta = {
  tileLayerId: string;
};

// Partial because objects are justified downstream in constructors
export type DataRequestMeta = {
  // request stop time in milliseconds since epoch
  requestStopTime?: number;
  warnings?: SearchResponseWarning[];
} & Partial<
  SourceRequestMeta &
    VectorSourceRequestMeta &
    VectorStyleRequestMeta &
    ESSearchSourceResponseMeta &
    ESGeoLineSourceResponseMeta &
    VectorTileLayerMeta
>;

type NumericalStyleFieldData = {
  avg: number;
  max: number;
  min: number;
  std_deviation: number;
};

type CategoricalStyleFieldData = {
  buckets: Array<{ key: string; doc_count: number }>;
  sum_other_doc_count: number;
};

export type StyleMetaData = {
  // key is field name for field requiring style meta
  [key: string]: NumericalStyleFieldData | CategoricalStyleFieldData;
};

export type DataRequestDescriptor = {
  dataId: string;
  dataRequestMetaAtStart?: DataRequestMeta | null;
  dataRequestToken?: symbol;
  data?: object;
  dataRequestMeta?: DataRequestMeta;
  error?: Error;
};
