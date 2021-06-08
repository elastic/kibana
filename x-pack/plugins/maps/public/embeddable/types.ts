/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IIndexPattern } from '../../../../../src/plugins/data/common/index_patterns';
import {
  EmbeddableInput,
  EmbeddableOutput,
  SavedObjectEmbeddableInput,
} from '../../../../../src/plugins/embeddable/public';
import { RefreshInterval, Query, Filter, TimeRange } from '../../../../../src/plugins/data/common';
import { MapCenterAndZoom, MapExtent } from '../../common/descriptor_types';
import { MapSavedObjectAttributes } from '../../common/map_saved_object_type';
import { MapSettings } from '../reducers/map';

export interface MapEmbeddableConfig {
  editable: boolean;
}

interface MapEmbeddableState {
  refreshConfig?: RefreshInterval;
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
  indexPatterns: IIndexPattern[];
};
