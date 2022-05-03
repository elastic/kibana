/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
import { EuiCallOut } from '@elastic/eui';
import type { TileRequest } from '../types';
import { getTileRequest } from './get_tile_request';
import { TileRequestDetails } from './tile_request_details';

interface Props {
  tileRequest: TileRequest;
}

interface State {
  path?: string;
  body?: string;
  error?: string;
}

export class TileRequestTab extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    try {
      const { path, body } = getTileRequest(this.props.tileRequest);
      this.state = {
        path,
        body: JSON.stringify(body, null, 2),
      };
    } catch (e) {
      this.state = {
        error: e.message,
      };
    }
  }

  render() {
    return this.state.path && this.state.body ? (
      <TileRequestDetails path={this.state.path} body={this.state.body} />
    ) : (
      <EuiCallOut
        title={i18n.translate('xpack.maps.inspector.vectorTileRequest.errorMessage', {
          defaultMessage: 'Unable to create Elasticsearch vector tile search request',
        })}
        color="warning"
        iconType="help"
      >
        <p>
          {i18n.translate('xpack.maps.inspector.vectorTileRequest.errorTitle', {
            defaultMessage: `Could not convert tile request, '{tileUrl}', to Elasticesarch vector tile search request, error: {error}`,
            values: {
              tileUrl: this.props.tileRequest.tileUrl,
              error: this.state.error,
            },
          })}
        </p>
      </EuiCallOut>
    );
  }
}
