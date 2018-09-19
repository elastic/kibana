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
import { VectorLayer } from '../vector_layer';

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
      <EuiText>
        <Fragment>
          <EuiSpacer size="m"/>
          <EuiSelect
            hasNoInitialSelection
            options={regionmapOptions}
            onChange={onChange}
            aria-label="Use aria labels when no actual label is in use"
          />
        </Fragment>
      </EuiText>
    );
  };

  renderDetails() {
    return (
      <Fragment>
        <div>
          <span className="bold">Source: </span><span>Kibana Region Map</span>
        </div>
        <div>
          <span className="bold">Type: </span><span>Vector (todo, use icon)</span>
        </div>
        <div>
          <span className="bold">Name: </span><span>{this._descriptor.name}</span>
        </div>
      </Fragment>
    );
  }

  async getGeoJson() {
    const fileSource = this._regionList.find(source => source.name === this._descriptor.name);
    return this._getGeoJson(fileSource, fileSource.url);
  }

  _createDefaultLayerDescriptor(options) {
    return VectorLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options
    });
  }

  createDefaultLayer(options) {
    return new VectorLayer({
      layerDescriptor: this._createDefaultLayerDescriptor(options),
      source: this
    });
  }

  getDisplayName() {
    return this._descriptor.name;
  }

}
