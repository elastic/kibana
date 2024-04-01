/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayerDescriptor } from '@kbn/maps-plugin/common';
import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-plugin/common';
import { replaceLayerList, updateLayerDescriptor } from '../actions';
import { MapStore } from '../reducers/store';
import { getIndexPatternsFromIds } from '../index_pattern_util';
import { getMapSettings, getQueryableUniqueIndexPatternIds } from '../selectors/map_selectors';
import { autoFitToBounds, syncDataForLayerId } from '../actions/data_request_actions';

export function initializeDataViews(store: MapStore) {
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);
  let dataViewsFetchToken: Symbol | undefined;

  async function updateDataViews() {
    const queryableDataViewIds = getQueryableUniqueIndexPatternIds(store.getState());
    const currentDataViewsFetchToken = Symbol();
    dataViewsFetchToken = currentDataViewsFetchToken;
    const dataViews = await getIndexPatternsFromIds(queryableDataViewIds);
    // ignore responses from obsolete requests
    if (currentDataViewsFetchToken !== dataViewsFetchToken) {
      return;
    }
    console.log('dataViews', dataViews);
    dataViews$.next(dataViews);
  }
  
  updateDataViews();

  const syncLayerTokens: Record<string, Symbol> = {};

  return {
    dataViews: dataViews$,
    setLayerList(layerList: LayerDescriptor[]) {
      store.dispatch<any>(replaceLayerList(layerList));
      updateDataViews();
    },
    updateLayerById: (layerDescriptor: LayerDescriptor) => {
      store.dispatch<any>(updateLayerDescriptor(layerDescriptor));
      updateDataViews();
      syncLayerTokens[layerDescriptor.id] = Symbol();
      (async () => {
        const currentSyncLayerToken = Symbol();
        syncLayerTokens[layerDescriptor.id] = currentSyncLayerToken;
        await store.dispatch<any>(syncDataForLayerId(layerDescriptor.id, false));
        // stop processing responses from obsolete requests
        if (currentSyncLayerToken !== syncLayerTokens[layerDescriptor.id]) {
          return;
        }
        if (getMapSettings(store.getState()).autoFitToDataBounds) {
          store.dispatch<any>(autoFitToBounds());
        }
      })();
    },
  }
}