/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import { SOURCE_TYPES } from '../../../../common/constants';
import { registerSource } from '../source_registry';

export class GeojsonFileSource extends AbstractVectorSource {
  static type = SOURCE_TYPES.GEOJSON_FILE;

  static createDescriptor(geoJson, name) {
    // Wrap feature as feature collection if needed
    let featureCollection;

    if (!geoJson) {
      featureCollection = {
        type: 'FeatureCollection',
        features: [],
      };
    } else if (geoJson.type === 'FeatureCollection') {
      featureCollection = geoJson;
    } else if (geoJson.type === 'Feature') {
      featureCollection = {
        type: 'FeatureCollection',
        features: [geoJson],
      };
    } else {
      // Missing or incorrect type
      featureCollection = {
        type: 'FeatureCollection',
        features: [],
      };
    }

    return {
      type: GeojsonFileSource.type,
      __featureCollection: featureCollection,
      name,
    };
  }

  async getGeoJsonWithMeta() {
    return {
      data: this._descriptor.__featureCollection,
      meta: {},
    };
  }

  async getDisplayName() {
    return this._descriptor.name;
  }

  canFormatFeatureProperties() {
    return true;
  }
}

registerSource({
  ConstructorFunction: GeojsonFileSource,
  type: SOURCE_TYPES.GEOJSON_FILE,
});
