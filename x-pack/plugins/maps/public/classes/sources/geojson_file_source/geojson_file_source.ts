/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, FeatureCollection } from 'geojson';
import { AbstractVectorSource, BoundsFilters, GeoJsonWithMeta } from '../vector_source';
import { EMPTY_FEATURE_COLLECTION, FIELD_ORIGIN, SOURCE_TYPES } from '../../../../common/constants';
import {
  GeoJsonFileFieldDescriptor,
  GeojsonFileSourceDescriptor,
  MapExtent,
} from '../../../../common/descriptor_types';
import { registerSource } from '../source_registry';
import { IField } from '../../fields/field';
import { getFeatureCollectionBounds } from '../../util/get_feature_collection_bounds';
import { GeoJsonFileField } from '../../fields/geojson_file_field';
import { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters';

function getFeatureCollection(
  geoJson: Feature | FeatureCollection | null | undefined
): FeatureCollection {
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

export class GeoJsonFileSource extends AbstractVectorSource {
  static createDescriptor(
    descriptor: Partial<GeojsonFileSourceDescriptor>
  ): GeojsonFileSourceDescriptor {
    return {
      type: SOURCE_TYPES.GEOJSON_FILE,
      __featureCollection: getFeatureCollection(descriptor.__featureCollection),
      __fields: descriptor.__fields || [],
      name: descriptor.name || 'Features',
    };
  }

  constructor(descriptor: Partial<GeojsonFileSourceDescriptor>, inspectorAdapters?: Adapters) {
    const normalizedDescriptor = GeoJsonFileSource.createDescriptor(descriptor);
    super(normalizedDescriptor, inspectorAdapters);
  }

  _getFields(): GeoJsonFileFieldDescriptor[] {
    const fields = (this._descriptor as GeojsonFileSourceDescriptor).__fields;
    return fields ? fields : [];
  }

  createField({ fieldName }: { fieldName: string }): IField {
    const fields = this._getFields();
    const descriptor: GeoJsonFileFieldDescriptor | undefined = fields.find((field) => {
      return field.name === fieldName;
    });

    if (!descriptor) {
      throw new Error(
        `Cannot find corresponding field ${fieldName} in __fields array ${JSON.stringify(
          this._getFields()
        )} `
      );
    }
    return new GeoJsonFileField({
      fieldName: descriptor.name,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
      dataType: descriptor.type,
    });
  }

  async getFields(): Promise<IField[]> {
    const fields = this._getFields();
    return fields.map((field: GeoJsonFileFieldDescriptor) => {
      return new GeoJsonFileField({
        fieldName: field.name,
        source: this,
        origin: FIELD_ORIGIN.SOURCE,
        dataType: field.type,
      });
    });
  }

  isBoundsAware(): boolean {
    return true;
  }

  async getBoundsForFilters(
    boundsFilters: BoundsFilters,
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

  async getDisplayName() {
    return (this._descriptor as GeojsonFileSourceDescriptor).name;
  }

  canFormatFeatureProperties() {
    return true;
  }
}

registerSource({
  ConstructorFunction: GeoJsonFileSource,
  type: SOURCE_TYPES.GEOJSON_FILE,
});
