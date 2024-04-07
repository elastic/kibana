/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import {
  HasLibraryTransforms,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesUnifiedSearch,
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
import { ILayer } from '../classes/layers/layer';
import { RenderToolTipContent } from '../classes/tooltips/tooltip_property';
import { EventHandlers } from '../reducers/non_serializable_instances';

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
  HasInspectorAdapters &
  PublishesDataLoading &
  PublishesDataViews &
  PublishesUnifiedSearch &
  HasLibraryTransforms<MapSerializeState> & {
    getLayerList: () => ILayer[];
    setEventHandlers: (eventHandlers: EventHandlers) => void;
    setLayerList: (layerList: LayerDescriptor[]) => void;
    setRenderTooltipContent: (renderTooltipContent: RenderToolTipContent) => void;
    updateLayerById: (layerDescriptor: LayerDescriptor) => void;
    onRenderComplete$: Observable<void>;
  };
