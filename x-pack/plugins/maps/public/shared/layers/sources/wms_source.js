/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';

import { AbstractTMSSource } from './tms_source';
import { TileLayer } from '../tile_layer';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';

export class WMSSource extends AbstractTMSSource {

  static type = 'WMS';
  static title = i18n.translate('xpack.maps.source.wmsTitle', {
    defaultMessage: 'Web Map Service'
  });
  static description = i18n.translate('xpack.maps.source.wmsDescription', {
    defaultMessage: 'Maps from OGC Standard WMS'
  });
  static icon = 'grid';

  static createDescriptor({ serviceUrl, layers, styles }) {
    return {
      type: WMSSource.type,
      serviceUrl: serviceUrl,
      layers: layers,
      styles: styles
    };
  }

  static renderEditor({  onPreviewSource, inspectorAdapters }) {
    const previewWMS = (options) => {
      const sourceDescriptor = WMSSource.createDescriptor(options);
      const source = new WMSSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
    return (<WMSEditor previewWMS={previewWMS} />);
  }

  async getImmutableProperties() {
    return [
      { label: getDataSourceLabel(), value: WMSSource.title },
      { label: getUrlLabel(), value: this._descriptor.serviceUrl },
      { label: i18n.translate('xpack.maps.source.wms.layersLabel', {
        defaultMessage: 'Layers'
      }), value: this._descriptor.layers },
      { label: i18n.translate('xpack.maps.source.wms.stylesLabel', {
        defaultMessage: 'Styles'
      }), value: this._descriptor.styles },
    ];
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
    return this._descriptor.serviceUrl;
  }

  getUrlTemplate() {
    const styles = this._descriptor.styles || '';
    // eslint-disable-next-line max-len
    return `${this._descriptor.serviceUrl}?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=${this._descriptor.layers}&styles=${styles}`;
  }
}


class WMSEditor extends  React.Component {

  state = {
    serviceUrl: '',
    layers: '',
    styles: ''
  }

  _previewIfPossible() {
    if (this.state.serviceUrl && this.state.layers) {
      //todo: should really debounce this so we don't get a ton of changes during typing
      this.props.previewWMS({
        serviceUrl: this.state.serviceUrl,
        layers: this.state.layers,
        styles: this.state.styles
      });
    }
  }

  async _handleServiceUrlChange(e) {
    await this.setState({
      serviceUrl: e.target.value
    });
    this._previewIfPossible();
  }

  async _handleLayersChange(e) {
    await this.setState({
      layers: e.target.value
    });
    this._previewIfPossible();
  }

  async _handleStylesChange(e) {
    await this.setState({
      styles: e.target.value
    });
    this._previewIfPossible();
  }


  render() {
    return (
      <Fragment>
        <EuiFormRow label="Url">
          <EuiFieldText
            value={this.state.serviceUrl}
            onChange={(e) => this._handleServiceUrlChange(e)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.wms.layersLabel', {
            defaultMessage: 'Layers'
          })}
          helpText={i18n.translate('xpack.maps.source.wms.layersHelpText', {
            defaultMessage: 'use comma separated list of layer names'
          })}
        >
          <EuiFieldText
            onChange={(e) => this._handleLayersChange(e)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.wms.stylesLabel', {
            defaultMessage: 'Styles'
          })}
          helpText={i18n.translate('xpack.maps.source.wms.stylesHelpText', {
            defaultMessage: 'use comma separated list of style names'
          })}
        >
          <EuiFieldText
            onChange={(e) => this._handleStylesChange(e)}
          />
        </EuiFormRow>
      </Fragment>

    );
  }
}
