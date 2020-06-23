/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from '../../../../../src/plugins/data/common/index_patterns';
import { MapSettings } from '../reducers/map';
import {
  EmbeddableInput,
  EmbeddableOutput,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../src/plugins/embeddable/public/lib/embeddables';
import { Filter, Query, RefreshInterval, TimeRange } from '../../../../../src/plugins/data/common';
import { LayerDescriptor, MapCenterAndZoom } from '../../common/descriptor_types';

export interface MapEmbeddableConfig {
  editUrl?: string;
  indexPatterns: IIndexPattern[];
  editable: boolean;
  title?: string;
  layerList: LayerDescriptor[];
  settings?: MapSettings;
}

export interface MapEmbeddableInput extends EmbeddableInput {
  timeRange?: TimeRange;
  filters: Filter[];
  query?: Query;
  refreshConfig: RefreshInterval;
  isLayerTOCOpen: boolean;
  openTOCDetails?: string[];
  disableTooltipControl?: boolean;
  disableInteractive?: boolean;
  hideToolbarOverlay?: boolean;
  hideLayerControl?: boolean;
  hideViewControl?: boolean;
  mapCenter?: MapCenterAndZoom;
  hiddenLayers?: string[];
  hideFilterActions?: boolean;
}

export interface MapEmbeddableOutput extends EmbeddableOutput {
  indexPatterns: IIndexPattern[];
}
