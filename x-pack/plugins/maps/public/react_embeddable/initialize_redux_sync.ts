/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, debounceTime, filter, map, Subscription } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { PaletteRegistry } from '@kbn/coloring';
import { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { MapCenterAndZoom } from '../../common/descriptor_types';
import { APP_ID, getEditPath, RENDER_TIMEOUT } from '../../common/constants';
import { MapStoreState } from '../reducers/store';
import { getIsLayerTOCOpen, getOpenTOCDetails } from '../selectors/ui_selectors';
import {
  getLayerList,
  getLayerListRaw,
  getMapBuffer,
  getMapCenter,
  getMapReady,
  getMapZoom,
  isMapLoading,
} from '../selectors/map_selectors';
import {
  setEmbeddableSearchContext,
  setExecutionContext,
  setGotoWithCenter,
  setHiddenLayers,
  setIsLayerTOCOpen,
  setMapSettings,
  setOpenTOCDetails,
  setReadOnly,
} from '../actions';
import type { MapSerializeState } from './types';
import { getCharts, getExecutionContextService } from '../kibana_services';
import {
  EventHandlers,
  getInspectorAdapters,
  setChartsPaletteServiceGetColor,
  setEventHandlers,
} from '../reducers/non_serializable_instances';
import { SavedMap } from '../routes';

function getMapCenterAndZoom(state: MapStoreState) {
  return {
    ...getMapCenter(state),
    zoom: getMapZoom(state),
  };
}

function getHiddenLayerIds(state: MapStoreState) {
  return getLayerListRaw(state)
    .filter((layer) => !layer.visible)
    .map((layer) => layer.id);
}

export function initializeReduxSync({
  savedMap,
  state,
  syncColors$,
  uuid,
}: {
  savedMap: SavedMap;
  state: MapSerializeState;
  syncColors$?: PublishingSubject<boolean | undefined>;
  uuid: string;
}) {
  const store = savedMap.getStore();

  // initializing comparitor publishing subjects to state instead of store state values
  // because store is not settled until map is rendered and mapReady is true
  const hiddenLayers$ = new BehaviorSubject<string[]>(
    state.hiddenLayers ?? getHiddenLayerIds(store.getState())
  );
  const isLayerTOCOpen$ = new BehaviorSubject<boolean>(
    state.isLayerTOCOpen ?? getIsLayerTOCOpen(store.getState())
  );
  const mapCenterAndZoom$ = new BehaviorSubject<MapCenterAndZoom>(
    state.mapCenter ?? getMapCenterAndZoom(store.getState())
  );
  const openTOCDetails$ = new BehaviorSubject<string[]>(
    state.openTOCDetails ?? getOpenTOCDetails(store.getState())
  );
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);

  const unsubscribeFromStore = store.subscribe(() => {
    if (!getMapReady(store.getState())) {
      return;
    }
    const nextHiddenLayers = getHiddenLayerIds(store.getState());
    if (!fastIsEqual(hiddenLayers$.value, nextHiddenLayers)) {
      hiddenLayers$.next(nextHiddenLayers);
    }

    const nextIsLayerTOCOpen = getIsLayerTOCOpen(store.getState());
    if (isLayerTOCOpen$.value !== nextIsLayerTOCOpen) {
      isLayerTOCOpen$.next(nextIsLayerTOCOpen);
    }

    const nextMapCenterAndZoom = getMapCenterAndZoom(store.getState());
    if (!fastIsEqual(mapCenterAndZoom$.value, nextMapCenterAndZoom)) {
      mapCenterAndZoom$.next(nextMapCenterAndZoom);
    }

    const nextOpenTOCDetails = getOpenTOCDetails(store.getState());
    if (!fastIsEqual(openTOCDetails$.value, nextOpenTOCDetails)) {
      openTOCDetails$.next(nextOpenTOCDetails);
    }

    const nextIsMapLoading = isMapLoading(store.getState());
    if (nextIsMapLoading !== dataLoading$.value) {
      dataLoading$.next(nextIsMapLoading);
    }
  });

  store.dispatch(setReadOnly(true));
  store.dispatch(
    setMapSettings({
      keydownScrollZoom: true,
      showTimesliderToggleButton: false,
    })
  );
  store.dispatch(setExecutionContext(getExecutionContext(uuid, state.savedObjectId)));

  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const query$ = new BehaviorSubject<AggregateQuery | Query | undefined>(undefined);
  const mapStateJSON = savedMap.getAttributes().mapStateJSON;
  if (mapStateJSON) {
    try {
      const mapState = JSON.parse(mapStateJSON);
      if (mapState.filters) {
        filters$.next(mapState.filters);
      }
      if (mapState.query) {
        query$.next(mapState.query);
      }
      store.dispatch(
        setEmbeddableSearchContext({
          filters: mapState.filters,
          query: mapState.query,
        })
      );
    } catch (e) {
      // ignore malformed mapStateJSON, not a critical error for viewing map - map will just use defaults
    }
  }

  let syncColorsSubscription: Subscription | undefined;
  let syncColorsSymbol: symbol | undefined;
  if (syncColors$) {
    syncColorsSubscription = syncColors$.subscribe(async (syncColors: boolean | undefined) => {
      const currentSyncColorsSymbol = Symbol();
      syncColorsSymbol = currentSyncColorsSymbol;
      const chartsPaletteServiceGetColor = syncColors
        ? await getChartsPaletteServiceGetColor()
        : null;
      if (syncColorsSymbol === currentSyncColorsSymbol) {
        store.dispatch(setChartsPaletteServiceGetColor(chartsPaletteServiceGetColor));
      }
    });
  }

  return {
    cleanup: () => {
      if (syncColorsSubscription) syncColorsSubscription.unsubscribe();
      unsubscribeFromStore();
    },
    api: {
      dataLoading: dataLoading$,
      filters$,
      getInspectorAdapters: () => {
        return getInspectorAdapters(store.getState());
      },
      getLayerList: () => {
        return getLayerList(store.getState());
      },
      onRenderComplete$: dataLoading$.pipe(
        filter((isDataLoading) => typeof isDataLoading === 'boolean' && !isDataLoading),
        debounceTime(RENDER_TIMEOUT),
        map(() => {
          // Observable notifies subscriber when rendering is complete
          // Return void to not expose internal implemenation details of observabale
          return;
        })
      ),
      query$,
      setEventHandlers: (eventHandlers: EventHandlers) => {
        store.dispatch(setEventHandlers(eventHandlers));
      },
    },
    comparators: {
      // mapBuffer comparator intentionally omitted and is not part of unsaved changes check
      hiddenLayers: [
        hiddenLayers$,
        (nextValue: string[]) => {
          store.dispatch<any>(setHiddenLayers(nextValue));
        },
        fastIsEqual,
      ],
      isLayerTOCOpen: [
        isLayerTOCOpen$,
        (nextValue: boolean) => {
          store.dispatch(setIsLayerTOCOpen(nextValue));
        },
      ],
      mapCenter: [
        mapCenterAndZoom$,
        (nextValue: MapCenterAndZoom) => {
          store.dispatch(setGotoWithCenter(nextValue));
        },
        fastIsEqual,
      ],
      openTOCDetails: [
        openTOCDetails$,
        (nextValue: string[]) => {
          store.dispatch(setOpenTOCDetails(nextValue));
        },
        fastIsEqual,
      ],
    } as StateComparators<MapSerializeState>,
    serialize: () => {
      return {
        hiddenLayers: getHiddenLayerIds(store.getState()),
        isLayerTOCOpen: getIsLayerTOCOpen(store.getState()),
        mapBuffer: getMapBuffer(store.getState()),
        mapCenter: getMapCenterAndZoom(store.getState()),
        openTOCDetails: getOpenTOCDetails(store.getState()),
      };
    },
  };
}

function getExecutionContext(uuid: string, savedObjectId: string | undefined) {
  const parentContext = getExecutionContextService().get();
  const mapContext: KibanaExecutionContext = {
    type: APP_ID,
    name: APP_ID,
    id: uuid,
    url: getEditPath(savedObjectId),
  };

  return parentContext
    ? {
        ...parentContext,
        child: mapContext,
      }
    : mapContext;
}

async function getChartsPaletteServiceGetColor(): Promise<((value: string) => string) | null> {
  const chartsService = getCharts();
  const paletteRegistry: PaletteRegistry | null = chartsService
    ? await chartsService.palettes.getPalettes()
    : null;
  if (!paletteRegistry) {
    return null;
  }

  const paletteDefinition = paletteRegistry.get('default');
  const chartConfiguration = { syncColors: true };
  return (value: string) => {
    const series = [{ name: value, rankAtDepth: 0, totalSeriesAtDepth: 1 }];
    const color = paletteDefinition.getCategoricalColor(series, chartConfiguration);
    return color ? color : '#3d3d3d';
  };
}
