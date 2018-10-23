/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorSource } from './source';
import React, { Fragment } from 'react';
import {
  EuiText,
  EuiSelect,
  EuiSpacer
} from '@elastic/eui';

export class KibanaRegionmapSource extends VectorSource {

  static type = 'REGIONMAP_FILE';

  constructor(descriptor, regionList) {
    super(descriptor);
    this._regionList = regionList;
  }

  static createDescriptor(name) {
    return { name,
      type: KibanaRegionmapSource.type
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
      <Fragment>
        <EuiSpacer size="m"/>
        <EuiSelect
          hasNoInitialSelection
          options={regionmapOptions}
          onChange={onChange}
          aria-label="Use aria labels when no actual label is in use"
        />
      </Fragment>
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
    return VectorSource.getGeoJson(fileSource, fileSource.url);
  }

  async getDisplayName() {
    return this._descriptor.name;
  }

  async isTimeAware() {
    return false;
  }
}
