/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../selectors/map_selectors', () => ({}));

import { mapExtentChanged } from './store_actions';

const getStoreMock = jest.fn();
const dispatchMock = jest.fn();

describe('store_actions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('mapExtentChanged', () => {
    beforeEach(() => {
      // getLayerList mocked to return emtpy array because
      // syncDataForAllLayers is triggered by selector and internally calls getLayerList
      require('../selectors/map_selectors').getLayerList = () => {
        return [];
      };
    });

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
            max_lat: 10,
            max_lon: 100,
            min_lat: 5,
            min_lon: 95,
          }
        });
        await action(dispatchMock, getStoreMock);

        expect(dispatchMock).toHaveBeenCalledWith({
          mapState: {
            extent: {
              max_lat: 10,
              max_lon: 100,
              min_lat: 5,
              min_lon: 95,
            },
            buffer: {
              max_lat: 12.5,
              max_lon: 102.5,
              min_lat: 2.5,
              min_lon: 92.5,
            }
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
              max_lat: 12.5,
              max_lon: 102.5,
              min_lat: 2.5,
              min_lon: 92.5,
            }
          };
        };
      });

      it('should not update buffer if extent is contained in existing buffer', async () => {
        const action = mapExtentChanged({
          zoom: initialZoom,
          extent: {
            max_lat: 11,
            max_lon: 101,
            min_lat: 6,
            min_lon: 96,
          }
        });
        await action(dispatchMock, getStoreMock);

        expect(dispatchMock).toHaveBeenCalledWith({
          mapState: {
            zoom: 10,
            extent: {
              max_lat: 11,
              max_lon: 101,
              min_lat: 6,
              min_lon: 96,
            },
            buffer: {
              max_lat: 12.5,
              max_lon: 102.5,
              min_lat: 2.5,
              min_lon: 92.5,
            }
          },
          type: 'MAP_EXTENT_CHANGED',
        });
      });

      it('should update buffer if extent is outside of existing buffer', async () => {
        const action = mapExtentChanged({
          zoom: initialZoom,
          extent: {
            max_lat: 5,
            max_lon: 90,
            min_lat: 0,
            min_lon: 85,
          }
        });
        await action(dispatchMock, getStoreMock);

        expect(dispatchMock).toHaveBeenCalledWith({
          mapState: {
            zoom: 10,
            extent: {
              max_lat: 5,
              max_lon: 90,
              min_lat: 0,
              min_lon: 85,
            },
            buffer: {
              max_lat: 7.5,
              max_lon: 92.5,
              min_lat: -2.5,
              min_lon: 82.5,
            }
          },
          type: 'MAP_EXTENT_CHANGED',
        });
      });

      it('should update buffer when zoom changes', async () => {
        const action = mapExtentChanged({
          zoom: initialZoom + 1,
          extent: {
            max_lat: 11,
            max_lon: 101,
            min_lat: 6,
            min_lon: 96,
          }
        });
        await action(dispatchMock, getStoreMock);

        expect(dispatchMock).toHaveBeenCalledWith({
          mapState: {
            zoom: 11,
            extent: {
              max_lat: 11,
              max_lon: 101,
              min_lat: 6,
              min_lon: 96,
            },
            buffer: {
              max_lat: 13.5,
              max_lon: 103.5,
              min_lat: 3.5,
              min_lon: 93.5,
            }
          },
          type: 'MAP_EXTENT_CHANGED',
        });
      });

    });

  });
});
