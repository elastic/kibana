/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-plugin/common';
import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  SavedObjectEmbeddableInput,
} from '@kbn/embeddable-plugin/public';
import { Query, TimeRange } from '@kbn/data-plugin/common';
import { MapCenterAndZoom, MapExtent } from '../../common/descriptor_types';
import { MapSavedObjectAttributes } from '../../common/map_saved_object_type';
import { MapSettings } from '../reducers/map';

export interface MapEmbeddableConfig {
  editable: boolean;
}

interface MapEmbeddableState {
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
}
export type MapByValueInput = {
  attributes: MapSavedObjectAttributes;
} & EmbeddableInput & { filterByMapExtent?: boolean } & MapEmbeddableState;
export type MapByReferenceInput = SavedObjectEmbeddableInput & {
  filterByMapExtent?: boolean;
} & MapEmbeddableState;
export type MapEmbeddableInput = MapByValueInput | MapByReferenceInput;

export type MapEmbeddableOutput = EmbeddableOutput & {
  indexPatterns: DataView[];
};

export type MapEmbeddableType = Embeddable<MapEmbeddableInput, MapEmbeddableOutput> & {
  setOnInitialRenderComplete(onInitialRenderComplete?: () => void): void;
  setIsSharable(isSharable: boolean): void;
};
