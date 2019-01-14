/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { TMSSource } from './tms_source';
import { TileLayer } from '../tile_layer';
import {
  EuiText,
  EuiSelect,
  EuiFormRow,
  EuiSpacer
} from '@elastic/eui';
import _ from 'lodash';


export class EMSTMSSource extends TMSSource {

  static type = 'EMS_TMS';
  static typeDisplayName = 'Elastic Maps Service tiles';

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

  static renderDropdownDisplayOption() {
    return  (
      <Fragment>
        <strong>{EMSTMSSource.typeDisplayName}</strong>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            Map tiles from Elastic Maps Service
          </p>
        </EuiText>
      </Fragment>
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

  getUrlTemplate() {
    const service = this._getTMSOptions();
    return service.url;
  }


}
