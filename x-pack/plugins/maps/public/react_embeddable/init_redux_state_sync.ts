/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { MapStore, MapStoreState } from '../reducers/store';
import { getIsLayerTOCOpen, getOpenTOCDetails } from '../selectors/ui_selectors';
import {
  getLayerListRaw,
  getMapBuffer,
  getMapCenter,
  getMapZoom,
} from '../selectors/map_selectors';
import { setGotoWithCenter, setHiddenLayers, setIsLayerTOCOpen, setOpenTOCDetails } from '../actions';
import { MapCenterAndZoom } from '@kbn/maps-plugin/common/descriptor_types';

function getMapCenterAndZoom(state: MapStoreState) {
  return {
    ...getMapCenter(state),
    zoom: getMapZoom(state)
  };
}

function getHiddenLayerIds(state: MapStoreState) {
  return getLayerListRaw(state).filter((layer) => !layer.visible).map((layer) => layer.id)
}

export function initReduxStateSync(store: MapStore) {
  const hiddenLayers$ = new BehaviorSubject<string[]>(getHiddenLayerIds(store.getState()));
  const isLayerTOCOpen$ = new BehaviorSubject<boolean>(getIsLayerTOCOpen(store.getState()));
  const mapCenterAndZoom$ = new BehaviorSubject<MapCenterAndZoom>(getMapCenterAndZoom(store.getState()));
  const openTOCDetails$ = new BehaviorSubject<string[]>(getOpenTOCDetails(store.getState()));

  const unsubscribeFromStore = store.subscribe(() => {
    const nextHiddenLayers = getHiddenLayerIds(store.getState());
    if (fastIsEqual(hiddenLayers$.value, nextHiddenLayers)) {
      hiddenLayers$.next(nextHiddenLayers);
    }

    const nextIsLayerTOCOpen = getIsLayerTOCOpen(store.getState());
    if (isLayerTOCOpen$.value !== nextIsLayerTOCOpen) {
      isLayerTOCOpen$.next(nextIsLayerTOCOpen);
    }

    const nextMapCenterAndZoom = getMapCenterAndZoom(store.getState());
    if (fastIsEqual(mapCenterAndZoom$.value, nextMapCenterAndZoom)) {
      mapCenterAndZoom$.next(nextMapCenterAndZoom);
    }

    const nextOpenTOCDetails = getOpenTOCDetails(store.getState());
    if (openTOCDetails$.value !== nextOpenTOCDetails) {
      openTOCDetails$.next(nextOpenTOCDetails);
    }
  });

  return {
    cleanupReduxStateSync: unsubscribeFromStore,
    reduxStateComparators: {
      // mapBuffer comparator intentionally omitted and is not part of unsaved changes check
      hiddenLayers: [
        hiddenLayers$,
        (nextValue: string[]) => {
          store.dispatch<any>(setHiddenLayers(nextValue));
        },
        fastIsEqual
      ],
      isLayerTOCOpen: [
        isLayerTOCOpen$,
        (nextValue: boolean) => {
          store.dispatch(setIsLayerTOCOpen(nextValue));
        }
      ],
      mapCenter: [
        mapCenterAndZoom$,
        (nextValue: MapCenterAndZoom) => {
          store.dispatch(setGotoWithCenter(nextValue));
        },
        fastIsEqual
      ],
      openTOCDetails: [
        openTOCDetails$,
        (nextValue: string[]) => {
          store.dispatch(setOpenTOCDetails(nextValue));
        }
      ]
    },
    serializeReduxState: () => {
      return {
        hiddenLayers: getHiddenLayerIds(store.getState()),
        isLayerTOCOpen: getIsLayerTOCOpen(store.getState()),
        mapBuffer: getMapBuffer(store.getState()),
        mapCenter: getMapCenterAndZoom(store.getState()),
        openTOCDetails: getOpenTOCDetails(store.getState()),
      };
    }
  }
}