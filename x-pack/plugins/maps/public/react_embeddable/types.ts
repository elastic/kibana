/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { TimeRange } from '@kbn/es-query';
import {
  HasLibraryTransforms,
  PublishesDataLoading,
  PublishesDataViews,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { Observable } from 'rxjs';
import { MapAttributes } from '../../common/content_management';
import {
  LayerDescriptor,
  MapCenterAndZoom,
  MapExtent,
  MapSettings,
} from '../../common/descriptor_types';

export interface MapSerializeState extends SerializedTitles {
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
  timeRange?: TimeRange;
  filterByMapExtent?: boolean;
  isMovementSynchronized?: boolean;

  // Configuration item that are never persisted
  // Putting in state as a temporary work around until
  // MapApi and React component are seperated from embeddable
  isSharable?: boolean;
}

export type MapApi = DefaultEmbeddableApi<MapSerializeState> &
  PublishesDataLoading &
  PublishesDataViews &
  HasLibraryTransforms<MapSerializeState> & {
    setLayerList: (layerList: LayerDescriptor[]) => void;
    updateLayerById: (layerDescriptor: LayerDescriptor) => void;
    onRenderComplete$: Observable<void>;
  };
