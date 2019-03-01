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

export class MapEmbeddableFactory extends EmbeddableFactory {

  constructor(gisMapSavedObjectLoader) {
    super({ name: 'map' });
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
      savedMap,
      editUrl: chrome.addBasePath(`/app/maps#/map/${panelMetadata.id}`),
      indexPatterns,
    });
  }
}
