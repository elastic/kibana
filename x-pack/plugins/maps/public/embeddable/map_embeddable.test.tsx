/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { MapEmbeddable } from './map_embeddable';

jest.mock('../kibana_services', () => {
  return {
    getHttp() {
      return {
        basePath: {
          prepend: (url) => url,
        },
      };
    },
    getMapsCapabilities() {
      return { save: true };
    },
    getSearchService() {
      return {
        session: {
          getSearchOptions() {
            return undefined;
          },
        },
      };
    },
    getShowMapsInspectorAdapter() {
      return false;
    },
    getTimeFilter() {
      return {
        getTime() {
          return { from: 'now-7d', to: 'now' };
        },
      };
    },
  };
});

jest.mock('../connected_components/map_container', () => {
  return {
    MapContainer: () => {
      return <div>mockLayerTOC</div>;
    },
  };
});

jest.mock('../routes/map_page', () => {
  class MockSavedMap {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    private _store = require('../reducers/store').createMapStore();
    private _attributes = {
      title: 'myMap',
    };

    whenReady = async function () {};

    getStore = function () {
      return this._store;
    };
    getAttributes = function () {
      return this._attributes;
    };
    getAutoFitToBounds = function () {
      return true;
    };
    getSharingSavedObjectProps = function () {
      return null;
    };
  }
  return { SavedMap: MockSavedMap };
});

function untilInitialized(mapEmbeddable: MapEmbeddable) {
  return new Promise((resolve) => {
    mapEmbeddable.setInitializationFinished = () => {
      resolve();
    };
  });
}

function onNextTick() {
  // wait one tick to give observables time to fire
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('shouldFetch$', () => {
  test('should not fetch when search context does not change', async () => {
    const mapEmbeddable = new MapEmbeddable(
      {},
      {
        id: 'map1',
      }
    );
    await untilInitialized(mapEmbeddable);

    const fetchSpy = jest.spyOn(mapEmbeddable, '_dispatchSetQuery');

    mapEmbeddable.updateInput({
      title: 'updated map title',
    });

    await onNextTick();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe('on searchSessionId change', () => {
    test('should fetch when filterByMapExtent is false', async () => {
      const mapEmbeddable = new MapEmbeddable(
        {},
        {
          id: 'map1',
          filterByMapExtent: false,
        }
      );
      await untilInitialized(mapEmbeddable);

      const fetchSpy = jest.spyOn(mapEmbeddable, '_dispatchSetQuery');

      mapEmbeddable.updateInput({
        searchSessionId: uuidv4(),
      });

      await onNextTick();

      expect(fetchSpy).toHaveBeenCalled();
    });

    test('should not fetch when filterByMapExtent is true', async () => {
      const mapEmbeddable = new MapEmbeddable(
        {},
        {
          id: 'map1',
          filterByMapExtent: true,
        }
      );
      await untilInitialized(mapEmbeddable);

      const fetchSpy = jest.spyOn(mapEmbeddable, '_dispatchSetQuery');

      mapEmbeddable.updateInput({
        searchSessionId: uuidv4(),
      });

      await onNextTick();

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
