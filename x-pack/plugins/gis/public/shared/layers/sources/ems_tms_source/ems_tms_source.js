/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { AbstractTMSSource } from '../tms_source';
import { TileLayer } from '../../tile_layer';
import {
  EuiSelect,
  EuiFormRow,
} from '@elastic/eui';
import _ from 'lodash';

import { getEmsTMSServices } from '../../../../meta';


export class EMSTMSSource extends AbstractTMSSource {

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

  constructor(descriptor) {
    super(descriptor);
    // this._emsTileServices = emsTmsServices;
  }

  async getImmutableProperties() {
    return [
      { label: 'Data source', value: EMSTMSSource.title },
      { label: 'Tile service', value: this._descriptor.id }
    ];
  }

  async _getTMSOptions() {
    const emsTileServices = await getEmsTMSServices();
    if(!emsTileServices) {
      return;
    }

    return emsTileServices.find(service => {
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
    const service = await this._getTMSOptions();
    if (!service || !service.attributionMarkdown) {
      return [];
    }

    return service.attributionMarkdown.split('|').map((attribution) => {
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

  async getUrlTemplate() {
    const service = await this._getTMSOptions();
    if (!service || !service.url) {
      throw new Error('Cannot generate EMS TMS url template');
    }
    return service.url;
  }
}
