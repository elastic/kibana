/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getControlledBy, MapEmbeddable } from './map_embeddable';
import { buildExistsFilter, disableFilter, pinFilter, toggleFilterNegated } from '@kbn/es-query';
import type { DataViewFieldBase, DataViewBase } from '@kbn/es-query';
import { MapEmbeddableConfig, MapEmbeddableInput } from './types';
import type { MapAttributes } from '../../common/content_management';

jest.mock('../kibana_services', () => {
  return {
    getExecutionContextService() {
      return {
        get: () => {
          return {};
        },
      };
    },
    getHttp() {
      return {
        basePath: {
          prepend: (url: string) => url,
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
    getEMSSettings() {
      return {
        isEMSUrlSet() {
          return false;
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
    private _attributes: MapAttributes = {
      title: 'myMap',
    };

    whenReady = async function () {};

    getStore() {
      return this._store;
    }
    getAttributes() {
      return this._attributes;
    }
    getAutoFitToBounds() {
      return true;
    }
    getSharingSavedObjectProps() {
      return null;
    }
  }
  return { SavedMap: MockSavedMap };
});

function untilInitialized(mapEmbeddable: MapEmbeddable): Promise<void> {
  return new Promise((resolve) => {
    // @ts-expect-error setInitializationFinished is protected but we are overriding it to know when embeddable is initialized
    mapEmbeddable.setInitializationFinished = () => {
      resolve();
    };
  });
}

function onNextTick(): Promise<void> {
  // wait one tick to give observables time to fire
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('shouldFetch$', () => {
  test('should not fetch when search context does not change', async () => {
    const mapEmbeddable = new MapEmbeddable(
      {} as unknown as MapEmbeddableConfig,
      {
        id: 'map1',
      } as unknown as MapEmbeddableInput
    );
    await untilInitialized(mapEmbeddable);

    const fetchSpy = jest.spyOn(mapEmbeddable, '_dispatchSetQuery');

    mapEmbeddable.updateInput({
      title: 'updated map title',
    });

    await onNextTick();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe('on filters change', () => {
    test('should fetch on filter change', async () => {
      const existsFilter = buildExistsFilter(
        {
          name: 'myFieldName',
        } as DataViewFieldBase,
        {
          id: 'myDataViewId',
        } as DataViewBase
      );
      const mapEmbeddable = new MapEmbeddable(
        {} as unknown as MapEmbeddableConfig,
        {
          id: 'map1',
          filters: [existsFilter],
        } as unknown as MapEmbeddableInput
      );
      await untilInitialized(mapEmbeddable);

      const fetchSpy = jest.spyOn(mapEmbeddable, '_dispatchSetQuery');

      mapEmbeddable.updateInput({
        filters: [toggleFilterNegated(existsFilter)],
      });

      await onNextTick();

      expect(fetchSpy).toHaveBeenCalled();
    });

    test('should not fetch on disabled filter change', async () => {
      const disabledFilter = disableFilter(
        buildExistsFilter(
          {
            name: 'myFieldName',
          } as DataViewFieldBase,
          {
            id: 'myDataViewId',
          } as DataViewBase
        )
      );
      const mapEmbeddable = new MapEmbeddable(
        {} as unknown as MapEmbeddableConfig,
        {
          id: 'map1',
          filters: [disabledFilter],
        } as unknown as MapEmbeddableInput
      );
      await untilInitialized(mapEmbeddable);

      const fetchSpy = jest.spyOn(mapEmbeddable, '_dispatchSetQuery');

      mapEmbeddable.updateInput({
        filters: [toggleFilterNegated(disabledFilter)],
      });

      await onNextTick();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('should not fetch when unpinned filter is pinned', async () => {
      const unpinnedFilter = buildExistsFilter(
        {
          name: 'myFieldName',
        } as DataViewFieldBase,
        {
          id: 'myDataViewId',
        } as DataViewBase
      );
      const mapEmbeddable = new MapEmbeddable(
        {} as unknown as MapEmbeddableConfig,
        {
          id: 'map1',
          filters: [unpinnedFilter],
        } as unknown as MapEmbeddableInput
      );
      await untilInitialized(mapEmbeddable);

      const fetchSpy = jest.spyOn(mapEmbeddable, '_dispatchSetQuery');

      mapEmbeddable.updateInput({
        filters: [pinFilter(unpinnedFilter)],
      });

      await onNextTick();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('should not fetch on filter controlled by map embeddable change', async () => {
      const embeddableId = 'map1';
      const filter = buildExistsFilter(
        {
          name: 'myFieldName',
        } as DataViewFieldBase,
        {
          id: 'myDataViewId',
        } as DataViewBase
      );
      const controlledByFilter = {
        ...filter,
        meta: {
          ...filter.meta,
          controlledBy: getControlledBy(embeddableId),
        },
      };
      const mapEmbeddable = new MapEmbeddable(
        {} as unknown as MapEmbeddableConfig,
        {
          id: embeddableId,
          filters: [controlledByFilter],
        } as unknown as MapEmbeddableInput
      );
      await untilInitialized(mapEmbeddable);

      const fetchSpy = jest.spyOn(mapEmbeddable, '_dispatchSetQuery');

      mapEmbeddable.updateInput({
        filters: [toggleFilterNegated(controlledByFilter)],
      });

      await onNextTick();

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('on searchSessionId change', () => {
    test('should fetch when filterByMapExtent is false', async () => {
      const mapEmbeddable = new MapEmbeddable(
        {} as unknown as MapEmbeddableConfig,
        {
          id: 'map1',
          filterByMapExtent: false,
        } as unknown as MapEmbeddableInput
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
        {} as unknown as MapEmbeddableConfig,
        {
          id: 'map1',
          filterByMapExtent: true,
        } as unknown as MapEmbeddableInput
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
