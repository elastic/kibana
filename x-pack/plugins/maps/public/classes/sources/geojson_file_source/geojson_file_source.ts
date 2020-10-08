/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, FeatureCollection } from 'geojson';
import { AbstractVectorSource } from '../vector_source';
import { EMPTY_FEATURE_COLLECTION, SOURCE_TYPES } from '../../../../common/constants';
import { GeojsonFileSourceDescriptor } from '../../../../common/descriptor_types';
import { registerSource } from '../source_registry';

function getFeatureCollection(geoJson: Feature | FeatureCollection | null): FeatureCollection {
  if (!geoJson) {
    return EMPTY_FEATURE_COLLECTION;
  }

  if (geoJson.type === 'FeatureCollection') {
    return geoJson;
  }

  if (geoJson.type === 'Feature') {
    return {
      type: 'FeatureCollection',
      features: [geoJson],
    };
  }

  return EMPTY_FEATURE_COLLECTION;
}

export class GeojsonFileSource extends AbstractVectorSource {
  static type = SOURCE_TYPES.GEOJSON_FILE;

  static createDescriptor(
    geoJson: Feature | FeatureCollection | null,
    name: string
  ): GeojsonFileSourceDescriptor {
    return {
      type: GeojsonFileSource.type,
      __featureCollection: getFeatureCollection(geoJson),
      name,
    };
  }

  async getGeoJsonWithMeta() {
    return {
      data: (this._descriptor as GeojsonFileSourceDescriptor).__featureCollection,
      meta: {},
    };
  }

  async getDisplayName() {
    return (this._descriptor as GeojsonFileSourceDescriptor).name;
  }

  canFormatFeatureProperties() {
    return true;
  }
}

registerSource({
  ConstructorFunction: GeojsonFileSource,
  type: SOURCE_TYPES.GEOJSON_FILE,
});
