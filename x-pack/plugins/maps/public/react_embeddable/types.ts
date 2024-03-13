/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultEmbeddableApi, SerializedReactEmbeddableTitles,
} from '@kbn/embeddable-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { MapAttributes } from '@kbn/maps-plugin/common/content_management';
import { MapCenterAndZoom, MapExtent, MapSettings } from '@kbn/maps-plugin/common/descriptor_types';
import { CanLinkToLibrary, CanUnlinkFromLibrary } from '@kbn/presentation-library';

export interface MapSerializeState extends SerializedReactEmbeddableTitles {
  // by-valye
  attributes?: MapAttributes;
  // by-reference
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

export type MapApi = DefaultEmbeddableApi<MapSerializeState> & 
  CanLinkToLibrary &
  CanUnlinkFromLibrary;