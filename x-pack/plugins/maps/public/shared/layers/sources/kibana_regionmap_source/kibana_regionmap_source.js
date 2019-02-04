/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import React from 'react';
import { CreateSourceEditor } from './create_source_editor';

import { getKibanaRegionList } from '../../../../meta';

export class KibanaRegionmapSource extends AbstractVectorSource {

  static type = 'REGIONMAP_FILE';
  static title = 'Custom vector shapes';
  static description = 'Vector shapes from static files configured in kibana.yml';
  static icon = 'logoKibana';

  constructor(descriptor) {
    super(descriptor);
  }

  static createDescriptor(options) {
    return {
      type: KibanaRegionmapSource.type,
      name: options.name
    };
  }

  static renderEditor = ({ onPreviewSource }) => {
    const onSelect = (layerConfig) => {
      const sourceDescriptor = KibanaRegionmapSource.createDescriptor(layerConfig);
      const source = new KibanaRegionmapSource(sourceDescriptor);
      onPreviewSource(source);
    };

    return (
      <CreateSourceEditor
        onSelect={onSelect}
      />
    );
  };

  async getImmutableProperties() {
    return [
      { label: 'Data source', value: KibanaRegionmapSource.title },
      { label: 'Vector layer', value: this._descriptor.name },
    ];
  }

  async _getVectorFileMeta() {
    const regionList = await getKibanaRegionList();
    const meta = regionList.find(source => source.name === this._descriptor.name);
    if (!meta) {
      throw new Error(`Unable to find map.regionmap configuration for ${this._descriptor.name}`);
    }
    return meta;
  }

  async getGeoJsonWithMeta() {
    const vectorFileMeta = await this._getVectorFileMeta();
    const featureCollection = await AbstractVectorSource.getGeoJson({
      format: vectorFileMeta.format.type,
      featureCollectionPath: vectorFileMeta.meta.feature_collection_path,
      fetchUrl: vectorFileMeta.url
    });
    return {
      data: featureCollection
    };
  }

  async getStringFields() {
    const vectorFileMeta = await this._getVectorFileMeta();
    return vectorFileMeta.fields.map(f => {
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
