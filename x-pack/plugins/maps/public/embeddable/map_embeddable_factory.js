/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EmbeddableFactory } from 'ui/embeddable';
import { MapEmbeddable } from './map_embeddable';
import { getMapSavedObjectLoader } from '../angular/services/gis_map_saved_object_loader';

export class MapEmbeddableFactory extends EmbeddableFactory {

  constructor() {
    super({ name: 'map' });
  }

  // gisMapSavedObjectLoader is instantiated instead of injected because
  // loading or using the 'gisMapSavedObjectLoader' service in mapEmbeddableFactoryProvider creates a
  // circular dependency loop in angular
  async getSavedObjectLoader() {
    if (this._savedObjectLoader) {
      return this._savedObjectLoader;
    }
    if (this._savedObjectLoaderPromise) {
      return this._savedObjectLoaderPromise;
    }

    this._savedObjectLoaderPromise = new Promise(async (resolve, reject) => {
      this._savedObjectLoader = await getMapSavedObjectLoader();
      resolve(this._savedObjectLoader);
    });
    return this._savedObjectLoaderPromise;
  }

  getEditPath(mapId) {
    return '';
  }

  async create(panelMetadata, onEmbeddableStateChanged) {
    const mapId = panelMetadata.id;
    const editUrl = this.getEditPath(mapId);

    const savedObjectLoader = await this.getSavedObjectLoader();
    const savedMap = await savedObjectLoader.get(mapId);
    console.log('savedMap', savedMap);

    return new MapEmbeddable({
      onEmbeddableStateChanged,
      savedMap,
      editUrl,
    });
  }
}
