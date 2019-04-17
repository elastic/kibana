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

  async _getIndexPatterns(indexPatternIds = []) {
    const promises = indexPatternIds.map(async (indexPatternId) => {
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
    const indexPatterns = await this._getIndexPatterns(savedMap.indexPatternIds);

    return new MapEmbeddable({
      onEmbeddableStateChanged,
      embeddableConfig: panelMetadata.embeddableConfig,
      savedMap,
      editUrl: chrome.addBasePath(createMapPath(panelMetadata.id)),
      indexPatterns,
    });
  }
}
