/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { ACTION_GLOBAL_APPLY_FILTER } from '@kbn/unified-search-plugin/public';
import { i18n } from '@kbn/i18n';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { getPanelTitle, StateComparators } from '@kbn/presentation-publishing';
import { createExtentFilter } from '../../common/elasticsearch_util';
import { SavedMap } from '../routes/map_page';
import { mapEmbeddablesSingleton } from '../embeddable/map_embeddables_singleton';
import {
  getGeoFieldNames,
  getGoto,
  getMapCenter,
  getMapExtent,
  getMapReady,
  getMapSettings,
  getMapZoom,
} from '../selectors/map_selectors';
import { setGotoWithCenter, setMapSettings } from '../actions';
import { MapExtent } from '../../common/descriptor_types';
import { getUiActions } from '../kibana_services';
import { getGeoFieldsLabel } from '../embeddable/get_geo_fields_label';
import { MapApi, MapSerializeState } from './types';
import { setOnMapMove } from '../reducers/non_serializable_instances';

export function initializeCrossPanelActions({
  controlledBy,
  getActionContext,
  getApi,
  savedMap,
  state,
  uuid,
}: {
  controlledBy: string;
  getActionContext: () => ActionExecutionContext;
  getApi: () => MapApi | undefined;
  savedMap: SavedMap;
  state: MapSerializeState;
  uuid: string;
}) {
  const isMovementSynchronized$ = new BehaviorSubject<boolean | undefined>(
    state.isMovementSynchronized
  );
  function getIsMovementSynchronized() {
    return isMovementSynchronized$.value ?? true;
  }
  function setIsMovementSynchronized(next: boolean) {
    isMovementSynchronized$.next(next);
  }

  const isFilterByMapExtent$ = new BehaviorSubject<boolean | undefined>(state.filterByMapExtent);
  function getIsFilterByMapExtent() {
    return isFilterByMapExtent$.value ?? false;
  }
  function setIsFilterByMapExtent(next: boolean) {
    isFilterByMapExtent$.next(next);
  }

  let prevMapExtent: MapExtent | undefined;

  function mapSyncHandler(lat: number, lon: number, zoom: number) {
    // auto fit to bounds is not compatable with map synchronization
    // auto fit to bounds may cause map location to never stablize and bound back and forth between bounds on different maps
    if (getMapSettings(savedMap.getStore().getState()).autoFitToDataBounds) {
      savedMap.getStore().dispatch(setMapSettings({ autoFitToDataBounds: false }));
    }
    savedMap.getStore().dispatch(setGotoWithCenter({ lat, lon, zoom }));
  }

  function gotoSynchronizedLocation() {
    const syncedLocation = mapEmbeddablesSingleton.getLocation();
    if (syncedLocation) {
      // set map to synchronized view
      mapSyncHandler(syncedLocation.lat, syncedLocation.lon, syncedLocation.zoom);
      return;
    }

    if (!getMapReady(savedMap.getStore().getState())) {
      // Initialize synchronized view to map's goto
      // Use goto because un-rendered map will not have accurate mapCenter and mapZoom.
      const goto = getGoto(savedMap.getStore().getState());
      if (goto && goto.center) {
        mapEmbeddablesSingleton.setLocation(
          uuid,
          goto.center.lat,
          goto.center.lon,
          goto.center.zoom
        );
        return;
      }
    }

    // Initialize synchronized view to map's view
    const center = getMapCenter(savedMap.getStore().getState());
    const zoom = getMapZoom(savedMap.getStore().getState());
    mapEmbeddablesSingleton.setLocation(uuid, center.lat, center.lon, zoom);
  }

  // debounce to fix timing issue for dashboard with multiple maps with synchronized movement and filter by map extent enabled
  const setMapExtentFilter = _.debounce(() => {
    const mapExtent = getMapExtent(savedMap.getStore().getState());
    const geoFieldNames = mapEmbeddablesSingleton.getGeoFieldNames();

    if (mapExtent === undefined || geoFieldNames.length === 0) {
      return;
    }

    prevMapExtent = mapExtent;

    const mapExtentFilter = createExtentFilter(mapExtent, geoFieldNames);
    mapExtentFilter.meta.controlledBy = controlledBy;
    mapExtentFilter.meta.alias = i18n.translate('xpack.maps.embeddable.boundsFilterLabel', {
      defaultMessage: '{geoFieldsLabel} within map bounds',
      values: { geoFieldsLabel: getGeoFieldsLabel(geoFieldNames) },
    });

    const executeContext = {
      ...getActionContext(),
      filters: [mapExtentFilter],
      controlledBy,
    };
    const action = getUiActions().getAction(ACTION_GLOBAL_APPLY_FILTER);
    if (!action) {
      throw new Error('Unable to apply map extent filter, could not locate action');
    }
    action.execute(executeContext);
  }, 100);

  function clearMapExtentFilter() {
    prevMapExtent = undefined;
    const executeContext = {
      ...getActionContext(),
      filters: [],
      controlledBy,
    };
    const action = getUiActions().getAction(ACTION_GLOBAL_APPLY_FILTER);
    if (!action) {
      throw new Error('Unable to apply map extent filter, could not locate action');
    }
    action.execute(executeContext);
  }

  mapEmbeddablesSingleton.register(uuid, {
    getTitle: () => {
      const mapApi = getApi();
      const title = mapApi ? getPanelTitle(mapApi) : undefined;
      return title
        ? title
        : i18n.translate('xpack.maps.embeddable.untitleMap', {
            defaultMessage: 'Untitled map',
          });
    },
    onLocationChange: mapSyncHandler,
    getIsMovementSynchronized,
    setIsMovementSynchronized: (isMovementSynchronized: boolean) => {
      setIsMovementSynchronized(isMovementSynchronized);
      if (isMovementSynchronized) {
        gotoSynchronizedLocation();
      } else if (!isMovementSynchronized && savedMap.getAutoFitToBounds()) {
        // restore autoFitToBounds when isMovementSynchronized disabled
        savedMap.getStore().dispatch(setMapSettings({ autoFitToDataBounds: true }));
      }
    },
    getIsFilterByMapExtent,
    setIsFilterByMapExtent: (isFilterByMapExtent: boolean) => {
      setIsFilterByMapExtent(isFilterByMapExtent);
      if (isFilterByMapExtent) {
        setMapExtentFilter();
      } else {
        clearMapExtentFilter();
      }
    },
    getGeoFieldNames: () => {
      return getGeoFieldNames(savedMap.getStore().getState());
    },
  });

  if (getIsMovementSynchronized()) {
    gotoSynchronizedLocation();
  }

  // Passing callback into redux store instead of regular pattern of getting redux state changes for performance reasons
  savedMap.getStore().dispatch(
    setOnMapMove((lat: number, lon: number, zoom: number) => {
      if (getIsMovementSynchronized()) {
        mapEmbeddablesSingleton.setLocation(uuid, lat, lon, zoom);
      }
    })
  );

  const unsubscribeFromStore = savedMap.getStore().subscribe(() => {
    if (!getMapReady(savedMap.getStore().getState())) {
      return;
    }

    if (getIsFilterByMapExtent() && !_.isEqual(prevMapExtent, savedMap.getStore().getState())) {
      setMapExtentFilter();
    }
  });

  return {
    cleanup: () => {
      mapEmbeddablesSingleton.unregister(uuid);
      unsubscribeFromStore();
    },
    comparators: {
      isMovementSynchronized: [isMovementSynchronized$, setIsMovementSynchronized],
      filterByMapExtent: [isFilterByMapExtent$, setIsFilterByMapExtent],
    } as StateComparators<MapSerializeState>,
    getIsFilterByMapExtent,
    serialize: () => {
      return {
        isMovementSynchronized: isMovementSynchronized$.value,
        filterByMapExtent: isFilterByMapExtent$.value,
      };
    },
  };
}
