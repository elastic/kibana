/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorSource } from './source';
import React from 'react';
import {
  EuiText,
  EuiSelect,
  EuiFormRow
} from '@elastic/eui';

export class KibanaRegionmapSource extends VectorSource {

  static type = 'REGIONMAP_FILE';
  static typeDisplayName = 'Custom region boundaries';

  constructor(descriptor, regionList) {
    super(descriptor);
    this._regionList = regionList;
  }

  static createDescriptor(name) {
    return {
      type: KibanaRegionmapSource.type,
      name: name
    };
  }

  static renderEditor = ({ dataSourcesMeta, onPreviewSource }) => {
    const regionmapOptionsRaw = (dataSourcesMeta) ? dataSourcesMeta.kibana.regionmap : [];
    const regionmapOptions = regionmapOptionsRaw ? regionmapOptionsRaw.map((file) => ({
      value: file.url,
      text: file.name
    })) : [];

    const onChange = ({ target }) => {
      const selectedName = target.options[target.selectedIndex].text;
      const kibanaRegionmapSourceDescriptor = KibanaRegionmapSource.createDescriptor(selectedName);
      const kibanaRegionmapSource = new KibanaRegionmapSource(kibanaRegionmapSourceDescriptor, regionmapOptionsRaw);
      onPreviewSource(kibanaRegionmapSource);
    };

    return (
      <EuiFormRow label="File">
        <EuiSelect
          hasNoInitialSelection
          options={regionmapOptions}
          onChange={onChange}
        />
      </EuiFormRow>
    );
  };

  renderDetails() {
    return (
      <EuiText color="subdued" size="s">
        <p className="gisLayerDetails">
          <strong className="gisLayerDetails__label">Source: </strong><span>Kibana Region Map</span><br/>
          <strong className="gisLayerDetails__label">Type: </strong><span>Vector</span><br/>
          <strong className="gisLayerDetails__label">Name: </strong><span>{this._descriptor.name}</span><br/>
        </p>
      </EuiText>
    );
  }

  async getGeoJson() {
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
}
