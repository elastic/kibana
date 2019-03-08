/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiForm,
} from '@elastic/eui';
import { WmsClient } from './wms_client';

export class WMSCreateSourceEditor extends Component {

  state = {
    serviceUrl: '',
    layers: '',
    styles: '',
    isLoadingCapabilities: false,
    getCapabilitiesError: null,
    hasAttemptedToLoadCapabilities: false,
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _previewIfPossible() {
    if (this.state.serviceUrl && this.state.layers) {
      this.props.previewWMS({
        serviceUrl: this.state.serviceUrl,
        layers: this.state.layers,
        styles: this.state.styles
      });
    }
  }

  _loadCapabilities = async () => {
    if (!this.state.serviceUrl) {
      return;
    }

    this.setState({
      hasAttemptedToLoadCapabilities: true,
      isLoadingCapabilities: true,
      getCapabilitiesError: null
    });

    const wmsClient = new WmsClient({ serviceUrl: this.state.serviceUrl });

    let layers;
    try {
      layers = await wmsClient.getLayers();
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          isLoadingCapabilities: false,
          getCapabilitiesError: error.message
        });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      isLoadingCapabilities: false,
    });
  }

  _handleServiceUrlChange(e) {
    this.setState({ serviceUrl: e.target.value }, this._previewIfPossible);
  }

  _handleLayersChange(e) {
    this.setState({ layers: e.target.value }, this._previewIfPossible);
  }

  _handleStylesChange(e) {
    this.setState({ styles: e.target.value }, this._previewIfPossible);
  }

  _renderLayerAndStyleInputs() {
    if (!this.state.hasAttemptedToLoadCapabilities || this.state.isLoadingCapabilities) {
      return null;
    }

    if (this.state.getCapabilitiesError) {
      return (
        <Fragment>
          <EuiCallOut
            title="Unable to load service metadata"
            color="warning"
          >
            <p>{this.state.getCapabilitiesError}</p>
            <EuiButton href="#" color="warning">Link button</EuiButton>
          </EuiCallOut>

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

    return (
      <div>layers and styles drop down placeholder</div>
    );
  }

  render() {
    return (
      <EuiForm>
        <EuiFormRow
          label="Url"
        >
          <EuiFieldText
            value={this.state.serviceUrl}
            onChange={(e) => this._handleServiceUrlChange(e)}
          />
        </EuiFormRow>

        <EuiButton
          onClick={this._loadCapabilities}
          isDisabled={!this.state.serviceUrl}
          isLoading={this.state.isLoadingCapabilities}
        >
          Load capabilities
        </EuiButton>

        {this._renderLayerAndStyleInputs()}

      </EuiForm>
    );
  }
}
