/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
import { EuiAccordion, EuiCallOut, EuiPanel } from '@elastic/eui';
import type { TileRequest } from '../types';
import { getTileRequest } from './get_tile_request';

interface Props {
  tileRequest: TileRequest;
}

interface State {
  esPath?: string;
  esBody?: object;
  error?: string;
}

export class TileRequestView extends Component<Props, State> {
  state: State = {};

  _onToggle = () => {
    if (!this.state.esPath || !this.state.esBody) {
      try {
        const { path, body } = getTileRequest(this.props.tileRequest);
        this.setState({
          esPath: path,
          esBody: body,
        });
      } catch (e) {
        this.setState({ error: e.message });
      }
    }
  };

  renderContent() {
    if (this.state.esPath && this.state.esBody) {
      return (
        <>
          <p>{this.state.esPath}</p>
          <p>{JSON.stringify(this.state.esBody, null, 2)}</p>
        </>
      );
    }

    if (this.state.error) {
      return (
        <EuiCallOut
          title={i18n.translate('xpack.maps.inspector.vectorTileRequest.errorMessage', {
            defaultMessage: 'Unable to create Elasticsearch vector tile search request',
          })}
          color="warning"
          iconType="help"
        >
          <p>
            {i18n.translate('xpack.maps.inspector.vectorTileRequest.errorTitle', {
              defaultMessage:
                `Could not convert Kibana tile request, '{tileUrl}', to Elasticesarch vector tile search request, error: {error}`,
              values: {
                tileUrl: this.props.tileRequest.tileUrl,
                error: this.state.error,
              },
            })}
          </p>
        </EuiCallOut>
      );
    }

    return null;
  }

  render() {
    return (
      <EuiAccordion
        id={this.props.tileRequest.tileZXYKey}
        buttonContent={this.props.tileRequest.tileZXYKey}
        onToggle={this._onToggle}
      >
        <EuiPanel>{this.renderContent()}</EuiPanel>
      </EuiAccordion>
    );
  }
}
