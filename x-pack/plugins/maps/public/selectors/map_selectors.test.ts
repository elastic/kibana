/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../classes/layers/vector_layer/vector_layer', () => {});
jest.mock('../classes/layers/tiled_vector_layer/tiled_vector_layer', () => {});
jest.mock('../classes/layers/blended_vector_layer/blended_vector_layer', () => {});
jest.mock('../classes/layers/heatmap_layer/heatmap_layer', () => {});
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
import { areLayersLoaded, getTimeFilters } from './map_selectors';
import { LayerDescriptor } from '../../common/descriptor_types';
import { ILayer } from '../classes/layers/layer';

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
    isDataLoaded = true,
    isVisible = true,
    showAtZoomLevel = true,
  }: {
    hasErrors?: boolean;
    isDataLoaded?: boolean;
    isVisible?: boolean;
    showAtZoomLevel?: boolean;
  }) {
    return ({
      hasErrors: () => {
        return hasErrors;
      },
      isDataLoaded: () => {
        return isDataLoaded;
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

  test('layer should be counted as loaded if its not visible', () => {
    const layerList = [createLayerMock({ isVisible: false })];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(areLayersLoaded.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(true);
  });

  test('layer should be counted as loaded if its not shown at zoom level', () => {
    const layerList = [createLayerMock({ showAtZoomLevel: false })];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(areLayersLoaded.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(true);
  });

  test('layer should be counted as loaded if it has a loading error', () => {
    const layerList = [createLayerMock({ hasErrors: true })];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(areLayersLoaded.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(true);
  });

  test('layer should be counted as loaded if its loaded', () => {
    const layerList = [createLayerMock({ isDataLoaded: true })];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(areLayersLoaded.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(true);
  });

  test('layer should not be counted as loaded if it has not loaded', () => {
    const layerList = [createLayerMock({ isDataLoaded: false })];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(areLayersLoaded.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(false);
  });
});
