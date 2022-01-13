/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from 'src/plugins/data/common';
import { Filter } from '@kbn/es-query';
import { TimeRange } from '../../../../../../../src/plugins/data/public';
import { MapCenter } from '../../../../common/descriptor_types';
import { MapSettings } from '../../../reducers/map';

export interface RefreshConfig {
  isPaused: boolean;
  interval: number;
}

// parsed contents of mapStateJSON
export interface SerializedMapState {
  zoom: number;
  center: MapCenter;
  timeFilters?: TimeRange;
  refreshConfig: RefreshConfig;
  query?: Query;
  filters: Filter[];
  settings: MapSettings;
}

// parsed contents of uiStateJSON
export interface SerializedUiState {
  isLayerTOCOpen: boolean;
  openTOCDetails: string[];
}
