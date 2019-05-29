/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { AbstractTMSSource } from '../tms_source';
import { TileLayer } from '../../tile_layer';

import { getEmsTMSServices } from '../../../../meta';
import { EMSTMSCreateSourceEditor } from './create_source_editor';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../../common/i18n_getters';


export class EMSTMSSource extends AbstractTMSSource {

  static type = 'EMS_TMS';
  static title = i18n.translate('xpack.maps.source.emsTileTitle', {
    defaultMessage: 'Tiles'
  });
  static description = i18n.translate('xpack.maps.source.emsTileDescription', {
    defaultMessage: 'Map tiles from Elastic Maps Service'
  });
  static icon = 'emsApp';

  static createDescriptor(serviceId) {
    return {
      type: EMSTMSSource.type,
      id: serviceId
    };
  }

  static renderEditor({ onPreviewSource, inspectorAdapters }) {

    const onChange = ({ target }) => {
      const selectedId = target.options[target.selectedIndex].value;
      const emsTMSSourceDescriptor = EMSTMSSource.createDescriptor(selectedId);
      const emsTMSSource = new EMSTMSSource(emsTMSSourceDescriptor, inspectorAdapters);
      onPreviewSource(emsTMSSource);
    };

    return <EMSTMSCreateSourceEditor onChange={onChange}/>;
  }

  async getImmutableProperties() {
    return [
      {
        label: getDataSourceLabel(),
        value: EMSTMSSource.title
      },
      {
        label: i18n.translate('xpack.maps.source.emsTile.serviceId', {
          defaultMessage: `Tile service`,
        }),
        value: this._descriptor.id
      }
    ];
  }

  async _getEmsTmsMeta() {
    const emsTileServices = await getEmsTMSServices();
    const meta = emsTileServices.find(service => {
      return service.id === this._descriptor.id;
    });
    if (!meta) {
      throw new Error(i18n.translate('xpack.maps.source.emsTile.errorMessage', {
        defaultMessage: `Unable to find EMS tile configuration for id: {id}`,
        values: { id: this._descriptor.id }
      }));
    }
    return meta;
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
    try {
      const emsTmsMeta = await this._getEmsTmsMeta();
      return emsTmsMeta.name;
    } catch (error) {
      return this._descriptor.id;
    }
  }

  async getAttributions() {
    const emsTmsMeta = await this._getEmsTmsMeta();
    if (!emsTmsMeta.attributionMarkdown) {
      return [];
    }

    return emsTmsMeta.attributionMarkdown.split('|').map((attribution) => {
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
    const emsTmsMeta = await this._getEmsTmsMeta();
    return emsTmsMeta.url;
  }
}
