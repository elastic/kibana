/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { INITIAL_LOCATION, MAX_ZOOM, MIN_ZOOM } from '../../common/constants';
import { MapSettings } from './map';
import { getIsDarkMode } from '../kibana_services';

export function getDefaultMapSettings(): MapSettings {
  return {
    autoFitToDataBounds: false,
    backgroundColor: getIsDarkMode()
      ? euiDarkVars.euiColorEmptyShade
      : euiLightVars.euiColorEmptyShade,
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
