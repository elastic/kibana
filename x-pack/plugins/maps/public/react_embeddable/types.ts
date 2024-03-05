/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DefaultEmbeddableApi,
  SerializedReactEmbeddableTitles,
} from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { MapCenterAndZoom, MapExtent, MapSettings } from '../../common/descriptor_types';
import type { MapAttributes } from '../../common/content_management';

export type MapEmbeddableSerializedState = SerializedReactEmbeddableTitles &  {
  // by-value embeddable stores map state inline
  attributes?: MapAttributes;
  // by-reference embeddable loads attributes from saved object
  savedObjectId?: string;
  isLayerTOCOpen?: boolean;
  openTOCDetails?: string[];
  mapCenter?: MapCenterAndZoom;
  mapBuffer?: MapExtent;
  mapSettings?: Partial<MapSettings>;
  hiddenLayers?: string[];
  hideFilterActions?: boolean;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  timeslice?: [number, number];
  filterByMapExtent?: boolean;
  isMovementSynchronized?: boolean;
}

export type MapApi = DefaultEmbeddableApi;