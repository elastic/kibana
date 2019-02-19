/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EmbeddableFactory } from 'ui/embeddable';
import { MapEmbeddable } from './map_embeddable';

export class MapEmbeddableFactory extends EmbeddableFactory {

  constructor(gisMapSavedObjectLoader) {
    super({ name: 'map' });
    this.savedObjectLoader = gisMapSavedObjectLoader;
  }

  getEditPath(mapId) {
    return mapId;
  }

  async create(panelMetadata, onEmbeddableStateChanged) {
    const mapId = panelMetadata.id;
    const editUrl = this.getEditPath(mapId);

    const savedMap = await this.savedObjectLoader.get(mapId);
    console.log('savedMap', savedMap);

    return new MapEmbeddable({
      onEmbeddableStateChanged,
      savedMap,
      editUrl,
    });
  }
}
