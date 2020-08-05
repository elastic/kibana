/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../classes/layers/vector_layer/vector_layer', () => {});
jest.mock('../classes/layers/tiled_vector_layer/tiled_vector_layer', () => {});
jest.mock('../classes/layers/blended_vector_layer/blended_vector_layer', () => {});
jest.mock('../classes/layers/heatmap_layer/heatmap_layer', () => {});
jest.mock('../classes/layers/vector_tile_layer/vector_tile_layer', () => {});
jest.mock('../classes/joins/inner_join', () => {});
jest.mock('../reducers/non_serializable_instances', () => ({
  getInspectorAdapters: () => {
    return {};
  },
}));
jest.mock('../kibana_services', () => ({
  getTimeFilter: () => ({
    getTime: () => {
      return {
        to: 'now',
        from: 'now-15m',
      };
    },
  }),
}));

import { DEFAULT_MAP_STORE_STATE } from '../reducers/store';
import { getTimeFilters } from './map_selectors';

describe('getTimeFilters', () => {
  it('should return timeFilters when contained in state', () => {
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

  it('should return kibana time filters when not contained in state', () => {
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
