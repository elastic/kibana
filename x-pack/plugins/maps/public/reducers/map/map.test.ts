/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MAP_STATE, map } from './map';
import { SET_MAP_SETTINGS } from '../../actions/map_action_constants';

describe('SET_MAP_SETTINGS', () => {
  test('Should preserve previous settings when setting partial map settings', () => {
    const updatedState1 = map(DEFAULT_MAP_STATE, {
      type: SET_MAP_SETTINGS,
      settings: {
        autoFitToDataBounds: true,
      }
    });
    const updatedState2 = map(updatedState1, {
      type: SET_MAP_SETTINGS,
      settings: {
        showTimesliderToggleButton: false,
      }
    });
    expect(updatedState2.settings).toEqual({
      autoFitToDataBounds: true,
      backgroundColor: '#ffffff',
      browserLocation: {
        zoom: 2,
      },
      disableInteractive: false,
      disableTooltipControl: false,
      fixedLocation: {
        'lat': 0,
        'lon': 0,
        'zoom': 2,
      },
      hideLayerControl: false,
      hideToolbarOverlay: false,
      hideViewControl: false,
      initialLocation: 'LAST_SAVED_LOCATION',
      maxZoom: 24,
      minZoom: 0,
      showScaleControl: false,
      showSpatialFilters: true,
      showTimesliderToggleButton: false,
      spatialFiltersAlpa: 0.3,
      spatialFiltersFillColor: '#DA8B45',
      spatialFiltersLineColor: '#DA8B45',
    });
  });
});