/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../classes/layers/vector_layer', () => {});
jest.mock('../classes/layers/tiled_vector_layer/tiled_vector_layer', () => {});
jest.mock('../classes/layers/blended_vector_layer/blended_vector_layer', () => {});
jest.mock('../classes/layers/heatmap_layer', () => {});
jest.mock('../classes/layers/vector_tile_layer/vector_tile_layer', () => {});
jest.mock('../classes/joins/inner_join', () => {});
jest.mock('../kibana_services', () => ({
  getTimeFilter: () => ({
    getTime: () => {
      return {
        to: 'now',
        from: 'now-15m',
      };
    },
  }),
  getMapsCapabilities() {
    return { save: true };
  },
}));

import { DEFAULT_MAP_STORE_STATE } from '../reducers/store';
import { areLayersLoaded, getDataFilters, getTimeFilters } from './map_selectors';
import { LayerDescriptor } from '../../common/descriptor_types';
import { ILayer } from '../classes/layers/layer';
import { Filter } from '../../../../../src/plugins/data/public';

describe('getDataFilters', () => {
  const mapExtent = {
    maxLat: 1,
    maxLon: 1,
    minLat: 0,
    minLon: 0,
  };
  const mapBuffer = {
    maxLat: 1.5,
    maxLon: 1.5,
    minLat: -0.5,
    minLon: -0.5,
  };
  const mapZoom = 4;
  const timeFilters = { to: '2001-01-01', from: '2001-12-31' };
  const refreshTimerLastTriggeredAt = '2001-01-01T00:00:00';
  const query = undefined;
  const filters: Filter[] = [];
  const searchSessionId = '12345';
  const searchSessionMapBuffer = {
    maxLat: 1.25,
    maxLon: 1.25,
    minLat: -0.25,
    minLon: -0.25,
  };

  test('should set buffer as searchSessionMapBuffer when using searchSessionId', () => {
    const dataFilters = getDataFilters.resultFunc(
      mapExtent,
      mapBuffer,
      mapZoom,
      timeFilters,
      refreshTimerLastTriggeredAt,
      query,
      filters,
      searchSessionId,
      searchSessionMapBuffer
    );
    expect(dataFilters.buffer).toEqual(searchSessionMapBuffer);
  });

  test('should fall back to screen buffer when using searchSessionId and searchSessionMapBuffer is not provided', () => {
    const dataFilters = getDataFilters.resultFunc(
      mapExtent,
      mapBuffer,
      mapZoom,
      timeFilters,
      refreshTimerLastTriggeredAt,
      query,
      filters,
      searchSessionId,
      undefined
    );
    expect(dataFilters.buffer).toEqual(mapBuffer);
  });
});

describe('getTimeFilters', () => {
  test('should return timeFilters when contained in state', () => {
    const state = {
      ...DEFAULT_MAP_STORE_STATE,
      map: {
        ...DEFAULT_MAP_STORE_STATE.map,
        mapState: {
          ...DEFAULT_MAP_STORE_STATE.map.mapState,
          timeFilters: {
            to: '2001-01-01',
            from: '2001-12-31',
          },
        },
      },
    };
    expect(getTimeFilters(state)).toEqual({ to: '2001-01-01', from: '2001-12-31' });
  });

  test('should return kibana time filters when not contained in state', () => {
    const state = {
      ...DEFAULT_MAP_STORE_STATE,
      map: {
        ...DEFAULT_MAP_STORE_STATE.map,
        mapState: {
          ...DEFAULT_MAP_STORE_STATE.map.mapState,
          timeFilters: undefined,
        },
      },
    };
    expect(getTimeFilters(state)).toEqual({ to: 'now', from: 'now-15m' });
  });
});

describe('areLayersLoaded', () => {
  function createLayerMock({
    hasErrors = false,
    isInitialDataLoadComplete = false,
    isVisible = true,
    showAtZoomLevel = true,
  }: {
    hasErrors?: boolean;
    isInitialDataLoadComplete?: boolean;
    isVisible?: boolean;
    showAtZoomLevel?: boolean;
  }) {
    return ({
      hasErrors: () => {
        return hasErrors;
      },
      isInitialDataLoadComplete: () => {
        return isInitialDataLoadComplete;
      },
      isVisible: () => {
        return isVisible;
      },
      showAtZoomLevel: () => {
        return showAtZoomLevel;
      },
    } as unknown) as ILayer;
  }

  test('layers waiting for map to load should not be counted loaded', () => {
    const layerList: ILayer[] = [];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [({} as unknown) as LayerDescriptor];
    const zoom = 4;
    expect(areLayersLoaded.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(false);
  });

  test('layer should not be counted as loaded if it has not loaded', () => {
    const layerList = [createLayerMock({ isInitialDataLoadComplete: false })];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(areLayersLoaded.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(false);
  });

  test('layer should be counted as loaded if its not visible', () => {
    const layerList = [createLayerMock({ isVisible: false, isInitialDataLoadComplete: false })];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(areLayersLoaded.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(true);
  });

  test('layer should be counted as loaded if its not shown at zoom level', () => {
    const layerList = [
      createLayerMock({ showAtZoomLevel: false, isInitialDataLoadComplete: false }),
    ];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(areLayersLoaded.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(true);
  });

  test('layer should be counted as loaded if it has a loading error', () => {
    const layerList = [createLayerMock({ hasErrors: true, isInitialDataLoadComplete: false })];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(areLayersLoaded.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(true);
  });

  test('layer should be counted as loaded if its loaded', () => {
    const layerList = [createLayerMock({ isInitialDataLoadComplete: true })];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(areLayersLoaded.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(true);
  });
});
