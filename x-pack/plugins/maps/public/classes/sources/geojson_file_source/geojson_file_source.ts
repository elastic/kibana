/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, FeatureCollection } from 'geojson';
import { AbstractVectorSource, ESGlobalFilters, GeoJsonWithMeta } from '../vector_source';
import { EMPTY_FEATURE_COLLECTION, SOURCE_TYPES } from '../../../../common/constants';
import { GeojsonFileSourceDescriptor, MapExtent } from '../../../../common/descriptor_types';
import { registerSource } from '../source_registry';
import { IField } from '../../fields/field';
import { getFeatureCollectionBounds } from '../../util/get_feature_collection_bounds';

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

  isBoundsAware(): boolean {
    return true;
  }

  async getBoundsForFilters(
    boundsFilters: ESGlobalFilters,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    const featureCollection = (this._descriptor as GeojsonFileSourceDescriptor).__featureCollection;
    return getFeatureCollectionBounds(featureCollection, false);
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
