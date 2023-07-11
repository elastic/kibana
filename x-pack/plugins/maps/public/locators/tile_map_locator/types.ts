/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, TimeRange, Query } from '@kbn/es-query';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { MapsAppLocator } from '../map_locator/types';

export interface MapsAppTileMapLocatorParams extends SerializableRecord {
  label: string;
  mapType: string;
  colorSchema: string;
  indexPatternId?: string;
  geoFieldName?: string;
  metricAgg: string;
  metricFieldName?: string;
  timeRange?: TimeRange;
  filters?: Filter[];
  query?: Query;
  hash?: boolean;
}

export type MapsAppTileMapLocator = LocatorPublic<MapsAppTileMapLocatorParams>;

export interface MapsAppTileMapLocatorDependencies {
  locator: MapsAppLocator;
}
