/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Query } from 'src/plugins/data/public';
import { SortDirection } from 'src/plugins/data/common/search';
import { RENDER_AS, SCALING_TYPES } from '../constants';
import { MapExtent, MapQuery } from './map_descriptor';
import { Filter, TimeRange } from '../../../../../src/plugins/data/common';

// Global map state passed to every layer.
export type MapFilters = {
  buffer?: MapExtent; // extent with additional buffer
  extent?: MapExtent; // map viewport
  filters: Filter[];
  query?: MapQuery;
  refreshTimerLastTriggeredAt?: string;
  searchSessionId?: string;
  timeFilters: TimeRange;
  zoom: number;
};

export type ESSearchSourceSyncMeta = {
  filterByMapBounds: boolean;
  sortField: string;
  sortOrder: SortDirection;
  scalingType: SCALING_TYPES;
  topHitsSplitField: string;
  topHitsSize: number;
};

export type ESGeoGridSourceSyncMeta = {
  requestType: RENDER_AS;
};

export type ESGeoLineSourceSyncMeta = {
  splitField: string;
  sortField: string;
};

export type ESTermSourceSyncMeta = {
  size: number;
};

export type VectorSourceSyncMeta =
  | ESSearchSourceSyncMeta
  | ESGeoGridSourceSyncMeta
  | ESGeoLineSourceSyncMeta
  | ESTermSourceSyncMeta
  | {
      // todo : needs to be extensible
      jobId: string;
      typicalActual: 'typical' | 'actual';
    }
  | null;

export type VectorSourceRequestMeta = MapFilters & {
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
  fieldNames: string[];
  geogridPrecision?: number;
  sourceQuery?: MapQuery;
  sourceMeta: VectorSourceSyncMeta;
};

export type VectorJoinSourceRequestMeta = Omit<VectorSourceRequestMeta, 'geogridPrecision'> & {
  sourceQuery?: Query;
};

export type VectorStyleRequestMeta = MapFilters & {
  dynamicStyleFields: string[];
  isTimeAware: boolean;
  sourceQuery: MapQuery;
  timeFilters: TimeRange;
};

export type ESSearchSourceResponseMeta = {
  areResultsTrimmed?: boolean;
  resultsCount?: number;

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
export type DataMeta = Partial<
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
  dataMetaAtStart?: DataMeta | null;
  dataRequestToken?: symbol;
  data?: object;
  dataMeta?: DataMeta;
};
