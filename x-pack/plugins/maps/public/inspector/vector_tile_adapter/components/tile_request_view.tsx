/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { EuiAccordion, EuiPanel } from '@elastic/eui';
import type { TileRequest } from '../types';
import { getTileRequest } from './get_tile_request';

interface Props {
  tileRequest: TileRequest;
}

interface State {
  esPath?: string;
  esBody?: object;
}

export class TileRequestView extends Component<Props, State> {
  state: State = {};

  _onToggle = () => {
    if (!this.state.esPath || !this.state.esBody) {
      const { path, body } = getTileRequest(this.props.tileRequest);
      this.setState({
        esPath: path,
        esBody: body
      });
    }
  };

  render() {
    return (
      <EuiAccordion
        id={this.props.tileRequest.tileZXYKey}
        buttonContent={this.props.tileRequest.tileZXYKey}
        onToggle={this._onToggle}
      >
        <EuiPanel>
          <p>
            {this.state.esPath}
          </p>
          <p>
            {JSON.stringify(this.state.esBody, null, 2)}
          </p>
        </EuiPanel>
      </EuiAccordion>
    );
  }
}
