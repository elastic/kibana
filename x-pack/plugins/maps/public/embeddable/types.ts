/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Query } from '../../../../../src/plugins/data/common';
import type { Filter } from '../../../../../src/plugins/data/common/es_query';
import { IndexPattern } from '../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import type { TimeRange } from '../../../../../src/plugins/data/common/query/timefilter/types';
import type { SavedObjectEmbeddableInput } from '../../../../../src/plugins/embeddable/common/lib/saved_object_embeddable';
import type { EmbeddableInput } from '../../../../../src/plugins/embeddable/common/types';
import { Embeddable } from '../../../../../src/plugins/embeddable/public/lib/embeddables/embeddable';
import type { EmbeddableOutput } from '../../../../../src/plugins/embeddable/public/lib/embeddables/i_embeddable';
import type { MapCenterAndZoom, MapExtent } from '../../common/descriptor_types/map_descriptor';
import type { MapSavedObjectAttributes } from '../../common/map_saved_object_type';
import type { MapSettings } from '../reducers/map/types';

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
  indexPatterns: IndexPattern[];
};

export type MapEmbeddableType = Embeddable<MapEmbeddableInput, MapEmbeddableOutput> & {
  setOnInitialRenderComplete(onInitialRenderComplete?: () => void): void;
  setIsSharable(isSharable: boolean): void;
};
