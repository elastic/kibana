/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { MapSavedObjectAttributes } from '../../../../common/map_saved_object_type';
import { createMapStore, MapStore, MapStoreState } from '../../../reducers/store';
import {
  getTimeFilters,
  getMapZoom,
  getMapCenter,
  getLayerListRaw,
  getRefreshConfig,
  getQuery,
  getFilters,
  getMapSettings,
} from '../../../selectors/map_selectors';
import { getIsLayerTOCOpen, getOpenTOCDetails } from '../../../selectors/ui_selectors';
import { copyPersistentState } from '../../../reducers/util';
import { getMapAttributeService } from '../../../map_attribute_service';

export class SavedMap {
  private readonly _mapEmbeddableInput?: MapEmbeddableInput;
  private readonly _store: MapStore;
  private _attributes: MapSavedObjectAttributes | null = null;

  constructor(mapEmbeddableInput?: MapEmbeddableInput) {
    this._mapEmbeddableInput = mapEmbeddableInput;
    this._store = createMapStore();
  }

  public getStore() {
    return this._store;
  }

  async loadAttributes() {
    if (!this._mapEmbeddableInput) {
      this._attributes = {
        title: i18n.translate('xpack.maps.newMapTitle', {
          defaultMessage: 'New Map',
        }),
      };
    } else {
      this._attributes = await getMapAttributeService().unwrapAttributes(this._mapEmbeddableInput);
    }
    return this._attributes;
  }

  public getAttributes(): MapSavedObjectAttributes {
    if (!this._attributes) {
      throw new Error('Invalid usage, must await loadAttributes before calling getAttributes');
    }

    return this._attributes;
  }

  public save() {
    if (!this._attributes) {
      throw new Error('Invalid usage, must await loadAttributes before calling save');
    }

    this._syncAttributesWithStore();

    const useRefType = false;
    getMapAttributeService().wrapAttributes(this._attributes, useRefType);
  }

  private _syncAttributesWithStore() {
    const state: MapStoreState = this._store().getState();
    const layerList = getLayerListRaw(state);
    const layerListConfigOnly = copyPersistentState(layerList);
    this._attributes!.layerListJSON = JSON.stringify(layerListConfigOnly);

    this._attributes!.mapStateJSON = JSON.stringify({
      zoom: getMapZoom(state),
      center: getMapCenter(state),
      timeFilters: getTimeFilters(state),
      refreshConfig: getRefreshConfig(state),
      query: _.omit(getQuery(state), 'queryLastTriggeredAt'),
      filters: getFilters(state),
      settings: getMapSettings(state),
    });

    this._attributes!.uiStateJSON = JSON.stringify({
      isLayerTOCOpen: getIsLayerTOCOpen(state),
      openTOCDetails: getOpenTOCDetails(state),
    });
  }
}
