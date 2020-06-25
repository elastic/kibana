/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../selectors/map_selectors', () => ({}));
jest.mock('./data_request_actions', () => {
  return {
    syncDataForAllLayers: () => {},
  };
});

import { mapExtentChanged, setMouseCoordinates } from './map_actions';

const getStoreMock = jest.fn();
const dispatchMock = jest.fn();

describe('map_actions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('mapExtentChanged', () => {
    describe('store mapState is empty', () => {
      beforeEach(() => {
        require('../selectors/map_selectors').getDataFilters = () => {
          return {};
        };
      });

      it('should add newMapConstants to dispatch action mapState', async () => {
        const action = mapExtentChanged({ zoom: 5 });
        await action(dispatchMock, getStoreMock);

        expect(dispatchMock).toHaveBeenCalledWith({
          mapState: {
            zoom: 5,
          },
          type: 'MAP_EXTENT_CHANGED',
        });
      });

      it('should add buffer to dispatch action mapState', async () => {
        const action = mapExtentChanged({
          extent: {
            maxLat: 10,
            maxLon: 100,
            minLat: 5,
            minLon: 95,
          },
        });
        await action(dispatchMock, getStoreMock);

        expect(dispatchMock).toHaveBeenCalledWith({
          mapState: {
            extent: {
              maxLat: 10,
              maxLon: 100,
              minLat: 5,
              minLon: 95,
            },
            buffer: {
              maxLat: 12.5,
              maxLon: 102.5,
              minLat: 2.5,
              minLon: 92.5,
            },
          },
          type: 'MAP_EXTENT_CHANGED',
        });
      });
    });

    describe('store mapState is populated', () => {
      const initialZoom = 10;
      beforeEach(() => {
        require('../selectors/map_selectors').getDataFilters = () => {
          return {
            zoom: initialZoom,
            buffer: {
              maxLat: 12.5,
              maxLon: 102.5,
              minLat: 2.5,
              minLon: 92.5,
            },
          };
        };
      });

      it('should not update buffer if extent is contained in existing buffer', async () => {
        const action = mapExtentChanged({
          zoom: initialZoom,
          extent: {
            maxLat: 11,
            maxLon: 101,
            minLat: 6,
            minLon: 96,
          },
        });
        await action(dispatchMock, getStoreMock);

        expect(dispatchMock).toHaveBeenCalledWith({
          mapState: {
            zoom: 10,
            extent: {
              maxLat: 11,
              maxLon: 101,
              minLat: 6,
              minLon: 96,
            },
            buffer: {
              maxLat: 12.5,
              maxLon: 102.5,
              minLat: 2.5,
              minLon: 92.5,
            },
          },
          type: 'MAP_EXTENT_CHANGED',
        });
      });

      it('should update buffer if extent is outside of existing buffer', async () => {
        const action = mapExtentChanged({
          zoom: initialZoom,
          extent: {
            maxLat: 5,
            maxLon: 90,
            minLat: 0,
            minLon: 85,
          },
        });
        await action(dispatchMock, getStoreMock);

        expect(dispatchMock).toHaveBeenCalledWith({
          mapState: {
            zoom: 10,
            extent: {
              maxLat: 5,
              maxLon: 90,
              minLat: 0,
              minLon: 85,
            },
            buffer: {
              maxLat: 7.5,
              maxLon: 92.5,
              minLat: -2.5,
              minLon: 82.5,
            },
          },
          type: 'MAP_EXTENT_CHANGED',
        });
      });

      it('should update buffer when zoom changes', async () => {
        const action = mapExtentChanged({
          zoom: initialZoom + 1,
          extent: {
            maxLat: 11,
            maxLon: 101,
            minLat: 6,
            minLon: 96,
          },
        });
        await action(dispatchMock, getStoreMock);

        expect(dispatchMock).toHaveBeenCalledWith({
          mapState: {
            zoom: 11,
            extent: {
              maxLat: 11,
              maxLon: 101,
              minLat: 6,
              minLon: 96,
            },
            buffer: {
              maxLat: 13.5,
              maxLon: 103.5,
              minLat: 3.5,
              minLon: 93.5,
            },
          },
          type: 'MAP_EXTENT_CHANGED',
        });
      });
    });
  });

  describe('setMouseCoordinates', () => {
    it('should create SET_MOUSE_COORDINATES action', () => {
      const action = setMouseCoordinates({
        lat: 10,
        lon: 100,
      });

      expect(action).toEqual({
        type: 'SET_MOUSE_COORDINATES',
        lat: 10,
        lon: 100,
      });
    });

    it('should handle longitudes that wrap east to west', () => {
      const action = setMouseCoordinates({
        lat: 10,
        lon: 190,
      });

      expect(action).toEqual({
        type: 'SET_MOUSE_COORDINATES',
        lat: 10,
        lon: -170,
      });
    });

    it('should handle longitudes that wrap west to east', () => {
      const action = setMouseCoordinates({
        lat: 10,
        lon: -190,
      });

      expect(action).toEqual({
        type: 'SET_MOUSE_COORDINATES',
        lat: 10,
        lon: 170,
      });
    });
  });
});
