/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import { parseString } from 'xml2js';

import {
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';

export class WMSCreateSourceEditor extends  React.Component {

  state = {
    serviceUrl: '',
    layers: '',
    styles: '',
    isLoadingCapabilities: false,
    layers: null,
    getCapabilitiesError: null,
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

  _loadCapabilities = _.debounce(async () => {
    if (!this.state.serviceUrl) {
      return;
    }

    this.setState({
      isLoadingCapabilities: true,
      getCapabilitiesError: null
    });

    let body;
    try {
      const resp = await fetch(`${this.state.serviceUrl}?version=1.1.1&request=GetCapabilities&service=WMS`);
      if (resp.status >= 400) {
        throw new Error(`Unable to access ${this.state.serviceUrl}`);
      }
      body = await resp.text();
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          isLoadingCapabilities: false,
          getCapabilitiesError: error.message
        });
      }
      return;
    }

    let capabilities;
    try {
      const parsePromise = new Promise((resolve, reject) => {
        parseString(body, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      });
      capabilities = await parsePromise;
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          isLoadingCapabilities: false,
          getCapabilitiesError: 'Unable to parse "GetCapabilities" response.'
        });
      }
      return;
    }

    console.log('capabilities', capabilities);

    if (!this._isMounted) {
      return;
    }
    this.setState({
      isLoadingCapabilities: false,
    });
  }, 300);

  _handleServiceUrlChange(e) {
    this.setState({ serviceUrl: e.target.value }, () => {
      this._loadCapabilities();
      this._previewIfPossible();
    });
  }

  _handleLayersChange(e) {
    this.setState({ layers: e.target.value }, this._previewIfPossible);
  }

  _handleStylesChange(e) {
    this.setState({ styles: e.target.value }, this._previewIfPossible);
  }

  render() {
    return (
      <Fragment>
        <EuiFormRow
          label="Url"
          isInvalid={this.state.getCapabilitiesError}
          error={this.state.getCapabilitiesError}
        >
          <EuiFieldText
            value={this.state.serviceUrl}
            onChange={(e) => this._handleServiceUrlChange(e)}
            isLoading={this.state.isLoadingCapabilities}
          />
        </EuiFormRow>
        <EuiFormRow label="Layers" helpText={'use comma separated list of layer names'}>
          <EuiFieldText
            onChange={(e) => this._handleLayersChange(e)}
          />
        </EuiFormRow>
        <EuiFormRow label="Styles" helpText={'use comma separated list of style names'}>
          <EuiFieldText
            onChange={(e) => this._handleStylesChange(e)}
          />
        </EuiFormRow>
      </Fragment>

    );
  }
}
