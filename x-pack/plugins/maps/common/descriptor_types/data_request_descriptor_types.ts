/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { Query } from 'src/plugins/data/common';
import type { Filter } from '@kbn/es-query';
import { MapExtent } from './map_descriptor';
import { TimeRange } from '../../../../../src/plugins/data/common';

export type Timeslice = {
  from: number;
  to: number;
};

// Global map state passed to every layer.
export type DataFilters = {
  buffer?: MapExtent; // extent with additional buffer
  extent?: MapExtent; // map viewport
  filters: Filter[];
  query?: Query;
  searchSessionId?: string;
  timeFilters: TimeRange;
  timeslice?: Timeslice;
  zoom: number;
  isReadOnly: boolean;
};

export type VectorSourceRequestMeta = DataFilters & {
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
  applyForceRefresh: boolean;
  fieldNames: string[];
  geogridPrecision?: number;
  timesliceMaskField?: string;
  sourceQuery?: Query;
  sourceMeta: object | null;
  isForceRefresh: boolean;
};

export type VectorJoinSourceRequestMeta = Omit<VectorSourceRequestMeta, 'geogridPrecision'>;

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
} & Partial<
  VectorSourceRequestMeta &
    VectorJoinSourceRequestMeta &
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
};
