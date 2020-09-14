/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { SavedObjectReference } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import {
  createSavedObjectClass,
  SavedObject,
  SavedObjectKibanaServices,
} from '../../../../../../../src/plugins/saved_objects/public';
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
// @ts-expect-error
import { extractReferences, injectReferences } from '../../../../common/migrations/references';
import { getExistingMapPath, MAP_SAVED_OBJECT_TYPE } from '../../../../common/constants';
import { getStore } from '../../store_operations';
import { MapStoreState } from '../../../reducers/store';
import { LayerDescriptor } from '../../../../common/descriptor_types';

export interface ISavedGisMap extends SavedObject {
  layerListJSON?: string;
  mapStateJSON?: string;
  uiStateJSON?: string;
  description?: string;
  getLayerList(): LayerDescriptor[];
  syncWithStore(): void;
}

export function createSavedGisMapClass(services: SavedObjectKibanaServices) {
  const SavedObjectClass = createSavedObjectClass(services);

  class SavedGisMap extends SavedObjectClass implements ISavedGisMap {
    public static type = MAP_SAVED_OBJECT_TYPE;

    // Mappings are used to place object properties into saved object _source
    public static mapping = {
      title: 'text',
      description: 'text',
      mapStateJSON: 'text',
      layerListJSON: 'text',
      uiStateJSON: 'text',
    };
    public static fieldOrder = ['title', 'description'];
    public static searchSource = false;

    public showInRecentlyAccessed = true;
    public layerListJSON?: string;
    public mapStateJSON?: string;
    public uiStateJSON?: string;

    constructor(id: string) {
      super({
        type: SavedGisMap.type,
        mapping: SavedGisMap.mapping,
        searchSource: SavedGisMap.searchSource,
        extractReferences,
        injectReferences: (savedObject: ISavedGisMap, references: SavedObjectReference[]) => {
          const { attributes } = injectReferences({
            attributes: { layerListJSON: savedObject.layerListJSON },
            references,
          });

          savedObject.layerListJSON = attributes.layerListJSON;
        },

        // if this is null/undefined then the SavedObject will be assigned the defaults
        id,

        // default values that will get assigned if the doc is new
        defaults: {
          title: i18n.translate('xpack.maps.newMapTitle', {
            defaultMessage: 'New Map',
          }),
          description: '',
        },
      });

      this.getFullPath = () => {
        return getExistingMapPath(this.id!);
      };
    }

    getLayerList() {
      return this.layerListJSON ? JSON.parse(this.layerListJSON) : null;
    }

    syncWithStore() {
      const state: MapStoreState = getStore().getState();
      const layerList = getLayerListRaw(state);
      const layerListConfigOnly = copyPersistentState(layerList);
      this.layerListJSON = JSON.stringify(layerListConfigOnly);

      this.mapStateJSON = JSON.stringify({
        zoom: getMapZoom(state),
        center: getMapCenter(state),
        timeFilters: getTimeFilters(state),
        refreshConfig: getRefreshConfig(state),
        query: _.omit(getQuery(state), 'queryLastTriggeredAt'),
        filters: getFilters(state),
        settings: getMapSettings(state),
      });

      this.uiStateJSON = JSON.stringify({
        isLayerTOCOpen: getIsLayerTOCOpen(state),
        openTOCDetails: getOpenTOCDetails(state),
      });
    }
  }
  return SavedGisMap;
}
