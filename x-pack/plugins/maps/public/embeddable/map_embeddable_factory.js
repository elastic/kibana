/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { EmbeddableFactory } from 'ui/embeddable';
import { MapEmbeddable } from './map_embeddable';

export class MapEmbeddableFactory extends EmbeddableFactory {

  constructor(gisMapSavedObjectLoader) {
    super({ name: 'map' });
    this.savedObjectLoader = gisMapSavedObjectLoader;
  }

  getEditPath(mapId) {
    return chrome.addBasePath(`/app/maps#map/${mapId}`);
  }

  async create(panelMetadata, onEmbeddableStateChanged) {
    const mapId = panelMetadata.id;
    const editUrl = this.getEditPath(mapId);

    const savedMap = await this.savedObjectLoader.get(mapId);

    return new MapEmbeddable({
      onEmbeddableStateChanged,
      savedMap,
      editUrl,
    });
  }
}
