/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import React from 'react';
import { GEOJSON_FILE } from '../../../../../common/constants';
import { ClientFileCreateSourceEditor } from './create_client_file_source_editor';

export class GeojsonFileSource extends AbstractVectorSource {

  static type = GEOJSON_FILE;
  static title = 'GeoJSON Vector File';
  static description = 'Client-provided GeoJSON vector shape file';

  static createDescriptor(featureCollection, name) {
    return {
      type: GeojsonFileSource.type,
      featureCollection,
      name
    };
  }

  static previewGeojsonFile = (onPreviewSource, inspectorAdapters) => {
    return (geojsonFile, name) => {
      if (!geojsonFile) {
        onPreviewSource(null);
        return;
      }
      const sourceDescriptor = GeojsonFileSource.createDescriptor(geojsonFile, name);
      const source = new GeojsonFileSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
  };

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    return (<ClientFileCreateSourceEditor
      previewGeojsonFile={
        GeojsonFileSource.previewGeojsonFile(onPreviewSource, inspectorAdapters)
      }
    />);
  }

  async getGeoJsonWithMeta() {
    return {
      data: this._descriptor.featureCollection,
      meta: {}
    };
  }

  async getDisplayName() {
    try {
      return this._descriptor.name;
    } catch (error) {
      return this._descriptor.id;
    }
  }

  canFormatFeatureProperties() {
    return true;
  }

  shouldBeIndexed() {
    return true;
  }

}
