/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import chrome from 'ui/chrome';
import { EmbeddableFactory } from 'ui/embeddable';
import { MapEmbeddable } from './map_embeddable';
import { indexPatternService } from '../kibana_services';
import { i18n } from '@kbn/i18n';
import { createMapPath, MAP_SAVED_OBJECT_TYPE, APP_ICON } from '../../common/constants';
import { createMapStore } from '../store/store';
import { addLayerWithoutDataSync } from '../actions/store_actions';
import { getQueryableUniqueIndexPatternIds } from '../selectors/map_selectors';
import { capabilities } from 'ui/capabilities';

export class MapEmbeddableFactory extends EmbeddableFactory {

  constructor(gisMapSavedObjectLoader) {
    super({
      name: 'map',
      savedObjectMetaData: {
        name: i18n.translate('xpack.maps.mapSavedObjectLabel', {
          defaultMessage: 'Map',
        }),
        type: MAP_SAVED_OBJECT_TYPE,
        getIconForSavedObject: () => APP_ICON
      },
    });
    this._savedObjectLoader = gisMapSavedObjectLoader;
  }

  async _getIndexPatterns(layerListJSON) {
    // Need to extract layerList from store to get queryable index pattern ids
    const store = createMapStore();
    try {
      JSON.parse(layerListJSON).forEach(layerDescriptor => {
        store.dispatch(addLayerWithoutDataSync(layerDescriptor));
      });
    } catch (error) {
      throw new Error(i18n.translate('xpack.maps.mapEmbeddableFactory', {
        defaultMessage: 'Unable to load map, malformed saved object',
      }));
    }
    const queryableIndexPatternIds = getQueryableUniqueIndexPatternIds(store.getState());

    const promises = queryableIndexPatternIds.map(async (indexPatternId) => {
      try {
        return await indexPatternService.get(indexPatternId);
      } catch (error) {
        // Unable to load index pattern, better to not throw error so map embeddable can render
        // Error will be surfaced by map embeddable since it too will be unable to locate the index pattern
        return null;
      }
    });
    const indexPatterns = await Promise.all(promises);
    return _.compact(indexPatterns);
  }

  async create(panelMetadata, onEmbeddableStateChanged) {
    const savedMap = await this._savedObjectLoader.get(panelMetadata.id);

    const indexPatterns = await this._getIndexPatterns(savedMap.layerListJSON);

    const editable = capabilities.get().maps.save;

    return new MapEmbeddable({
      onEmbeddableStateChanged,
      embeddableConfig: panelMetadata.embeddableConfig,
      savedMap,
      editUrl: chrome.addBasePath(createMapPath(panelMetadata.id)),
      editable,
      indexPatterns,
    });
  }
}
