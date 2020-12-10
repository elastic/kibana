/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, FeatureCollection } from 'geojson';
import { AbstractVectorSource, GeoJsonWithMeta } from '../vector_source';
import { EMPTY_FEATURE_COLLECTION, SOURCE_TYPES } from '../../../../common/constants';
import { GeojsonFileSourceDescriptor } from '../../../../common/descriptor_types';
import { registerSource } from '../source_registry';
import { IField } from '../../fields/field';

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
  static createDescriptor(
    geoJson: Feature | FeatureCollection | null,
    name: string
  ): GeojsonFileSourceDescriptor {
    return {
      type: SOURCE_TYPES.GEOJSON_FILE,
      __featureCollection: getFeatureCollection(geoJson),
      name,
    };
  }

  async getGeoJsonWithMeta(): Promise<GeoJsonWithMeta> {
    return {
      data: (this._descriptor as GeojsonFileSourceDescriptor).__featureCollection,
      meta: {},
    };
  }

  createField({ fieldName }: { fieldName: string }): IField {
    throw new Error('Not implemented');
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
