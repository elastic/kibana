/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import { debounceTime, first, switchMap } from 'rxjs/operators';
import { getLayerList } from '../../../selectors/map_selectors';
import { MapStore } from '../../../reducers/store';

export function waitUntilTimeLayersLoad$(store: MapStore) {
  // @ts-expect-error
  const reduxState$ = from(store);
  return reduxState$.pipe(
    debounceTime(300),
    // using switchMap since switchMap will discard promise from previous state iterations in progress
    switchMap(async (state) => {
      const promises = getLayerList(state).map(async (layer) => {
        return {
          isFilteredByGlobalTime: await layer.isFilteredByGlobalTime(),
          layer,
        };
      });
      const layersWithMeta = await Promise.all(promises);
      return layersWithMeta;
    }),
    first((layersWithMeta) => {
      const areTimeLayersStillLoading = layersWithMeta
        .filter(({ isFilteredByGlobalTime }) => isFilteredByGlobalTime)
        .some(({ layer }) => layer.isLayerLoading());
      return !areTimeLayersStillLoading;
    })
  );
}
