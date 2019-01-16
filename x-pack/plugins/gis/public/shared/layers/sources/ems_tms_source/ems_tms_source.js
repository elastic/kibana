/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { TMSSource } from '../tms_source';
import { TileLayer } from '../../tile_layer';
import {
  EuiText,
  EuiSelect,
  EuiFormRow,
} from '@elastic/eui';
import _ from 'lodash';


export class EMSTMSSource extends TMSSource {

  static type = 'EMS_TMS';
  static title = 'Elastic Maps Service tiles';
  static description = 'Map tiles from Elastic Maps Service';
  static icon = 'emsApp';

  static createDescriptor(serviceId) {
    return {
      type: EMSTMSSource.type,
      id: serviceId
    };
  }

  static renderEditor({ dataSourcesMeta, onPreviewSource }) {

    const emsTmsOptionsRaw = _.get(dataSourcesMeta, "ems.tms", []);
    const emsTileOptions = emsTmsOptionsRaw.map((service) => ({
      value: service.id,
      text: service.id //due to not having human readable names
    }));

    const onChange = ({ target }) => {
      const selectedId = target.options[target.selectedIndex].value;
      const emsTMSSourceDescriptor = EMSTMSSource.createDescriptor(selectedId);
      const emsTMSSource = new EMSTMSSource(emsTMSSourceDescriptor, emsTmsOptionsRaw);
      onPreviewSource(emsTMSSource);
    };
    return (
      <EuiFormRow label="Tile service">
        <EuiSelect
          hasNoInitialSelection
          options={emsTileOptions}
          onChange={onChange}
        />
      </EuiFormRow>
    );
  }

  constructor(descriptor, { emsTmsServices }) {
    super(descriptor);
    this._emsTileServices = emsTmsServices;
  }

  renderDetails() {
    return (
      <EuiText color="subdued" size="s">
        <p className="gisLayerDetails">
          <strong className="gisLayerDetails__label">Source </strong><span>Elastic Maps Service</span><br/>
          <strong className="gisLayerDetails__label">Type </strong><span>Tile</span><br/>
          <strong className="gisLayerDetails__label">Id </strong><span>{this._descriptor.id}</span><br/>
        </p>
      </EuiText>
    );
  }

  _getTMSOptions() {
    return this._emsTileServices.find(service => {
      return service.id === this._descriptor.id;
    });
  }

  _createDefaultLayerDescriptor(options) {
    return TileLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options
    });
  }

  createDefaultLayer(options) {
    return new TileLayer({
      layerDescriptor: this._createDefaultLayerDescriptor(options),
      source: this
    });
  }

  async getDisplayName() {
    return this._descriptor.id;
  }

  async getAttributions() {
    const service = this._getTMSOptions();
    const attributions = service.attributionMarkdown.split('|');

    return attributions.map((attribution) => {
      attribution = attribution.trim();
      //this assumes attribution is plain markdown link
      const extractLink = /\[(.*)\]\((.*)\)/;
      const result = extractLink.exec(attribution);
      return {
        label: result ? result[1] : null,
        url: result ? result[2] : null
      };
    });
  }

  getUrlTemplate() {
    const service = this._getTMSOptions();
    return service.url;
  }


}
