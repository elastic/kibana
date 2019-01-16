/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { VectorSource } from '../vector_source';
import React from 'react';
import {
  EuiText,
} from '@elastic/eui';
import { CreateSourceEditor } from './create_source_editor';

export class KibanaRegionmapSource extends VectorSource {

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

  renderDetails() {
    return (
      <EuiText color="subdued" size="s">
        <p className="gisLayerDetails">
          <strong className="gisLayerDetails__label">Source </strong><span>Kibana Region Map</span><br/>
          <strong className="gisLayerDetails__label">Type </strong><span>Vector</span><br/>
          <strong className="gisLayerDetails__label">Name </strong><span>{this._descriptor.name}</span><br/>
        </p>
      </EuiText>
    );
  }

  async getGeoJsonWithMeta() {
    const fileSource = this._regionList.find(source => source.name === this._descriptor.name);
    const featureCollection = await VectorSource.getGeoJson(fileSource, fileSource.url);
    return {
      data: featureCollection
    };
  }

  async getStringFields() {
    //todo: use map/service-settings instead.
    const fileSource = this._regionList.find((source => source.name === this._descriptor.name));

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
