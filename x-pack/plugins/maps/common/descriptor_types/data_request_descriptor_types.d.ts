/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Filter, TimeRange } from 'src/plugins/data/public';
import { RENDER_AS, SORT_ORDER, SCALING_TYPES } from '../constants';
import { MapExtent, MapQuery } from './map_descriptor';

// Global map state passed to every layer.
export type MapFilters = {
  buffer: MapExtent; // extent with additional buffer
  extent: MapExtent; // map viewport
  filters: Filter[];
  query: MapQuery;
  refreshTimerLastTriggeredAt: string;
  timeFilters: TimeRange;
  zoom: number;
};

export type DataRequestContext = {
  startLoading(dataId: string, requestToken: symbol, meta: DataMeta): void;
  stopLoading(dataId: string, requestToken: symbol, data: unknown, meta: DataMeta): void;
  onLoadError(dataId: string, requestToken: symbol, errorMessage: string): void;
  updateSourceData(newData: unknown): void;
  isRequestStillActive(dataId: string, requestToken: symbol): boolean;
  registerCancelCallback(requestToken: symbol, callback: () => void): void;
  dataFilters: MapFilters;
};

type ESSearchSourceSyncMeta = {
  sortField: string;
  sortOrder: SORT_ORDER;
  scalingType: SCALING_TYPES;
  topHitsSplitField: string;
  topHitsSize: number;
};

type ESGeoGridSourceSyncMeta = {
  requestType: RENDER_AS;
};

export type VectorSourceSyncMeta = ESSearchSourceSyncMeta | ESGeoGridSourceSyncMeta | null;

export type VectorSourceRequestMeta = MapFilters & {
  applyGlobalQuery: boolean;
  fieldNames: string[];
  geogridPrecision?: number;
  sourceQuery: MapQuery;
  sourceMeta: VectorSourceSyncMeta;
};

export type VectorStyleRequestMeta = MapFilters & {
  dynamicStyleFields: string[];
  isTimeAware: boolean;
  sourceQuery: MapQuery;
  timeFilters: unknown;
};

export type ESSearchSourceResponseMeta = {
  areResultsTrimmed?: boolean;
  sourceType?: string;

  // top hits meta
  areEntitiesTrimmed?: boolean;
  entityCount?: number;
  totalEntities?: number;
};

// Partial because objects are justified downstream in constructors
export type DataMeta = Partial<VectorSourceRequestMeta> &
  Partial<VectorStyleRequestMeta> &
  Partial<ESSearchSourceResponseMeta>;

export type DataRequestDescriptor = {
  dataId: string;
  dataMetaAtStart?: DataMeta | null;
  dataRequestToken?: symbol;
  data?: object;
  dataMeta?: DataMeta;
};
