/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INITIAL_LOCATION, MAX_ZOOM, MIN_ZOOM } from '../../common/constants';
import { MapSettings } from './map';

export function getDefaultMapSettings(): MapSettings {
  return {
    initialLocation: INITIAL_LOCATION.LAST_SAVED_LOCATION,
    fixedLocation: { lat: 0, lon: 0, zoom: 2 },
    browserLocation: { zoom: 2 },
    maxZoom: MAX_ZOOM,
    minZoom: MIN_ZOOM,
    showSpatialFilters: true,
    spatialFiltersAlpa: 0.3,
    spatialFiltersFillColor: '#DA8B45',
    spatialFiltersLineColor: '#DA8B45',
  };
}
