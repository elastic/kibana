/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { AbstractVectorSource } from '../vector_source';
import React from 'react';
import { CreateSourceEditor } from './create_source_editor';

export class KibanaRegionmapSource extends AbstractVectorSource {

  static type = 'REGIONMAP_FILE';
  static title = 'Custom vector shapes';
  static description = 'Vector shapes from static files configured in kibana.yml';
  static icon = 'logoKibana';

  constructor(descriptor, { ymlFileLayers }) {
    super(descriptor);
    this._regionList = ymlFileLayers;
  }

  static createDescriptor(options) {
    return {
      type: KibanaRegionmapSource.type,
      name: options.name
    };
  }

  static renderEditor = ({ dataSourcesMeta, onPreviewSource }) => {
    const regionmapLayers = _.get(dataSourcesMeta, 'kibana.regionmap', []);

    const onSelect = (layerConfig) => {
      const sourceDescriptor = KibanaRegionmapSource.createDescriptor(layerConfig);
      const source = new KibanaRegionmapSource(sourceDescriptor, { ymlFileLayers: regionmapLayers });
      onPreviewSource(source);
    };

    return (
      <CreateSourceEditor
        onSelect={onSelect}
        regionmapLayers={regionmapLayers}
      />
    );
  };

  async getImmutableProperties() {
    return [
      { label: 'Data source', value: KibanaRegionmapSource.title },
      { label: 'Vector layer', value: this._descriptor.name },
    ];
  }

  async getGeoJsonWithMeta() {
    const fileSource = this._regionList.find(source => source.name === this._descriptor.name);
    if (!fileSource) {
      throw new Error(`Unable to find map.regionmap configuration for ${this._descriptor.name}`);
    }
    const featureCollection = await AbstractVectorSource.getGeoJson(fileSource, fileSource.url);
    return {
      data: featureCollection
    };
  }

  async getStringFields() {
    //todo: use map/service-settings instead.
    const fileSource = this._regionList.find((source => source.name === this._descriptor.name));

    if (!fileSource) {
      return [];
    }

    return fileSource.fields.map(f => {
      return { name: f.name, label: f.description };
    });
  }

  async getDisplayName() {
    return this._descriptor.name;
  }

  async isTimeAware() {
    return false;
  }

  canFormatFeatureProperties() {
    return true;
  }
}
