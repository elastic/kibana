/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';

import { getKibanaTileMap } from '../../../../meta';

const NO_TILEMAP_LAYER_MSG =
  'No tilemap layer is available.' +
  ' Ask your system administrator to set "map.tilemap.url" in kibana.yml.';



export class CreateSourceEditor extends Component {


  state = {
    url: null
  }

  _loadUrl = async () => {
    const tilemap = await getKibanaTileMap();
    if (this._isMounted) {
      this.setState({
        url: tilemap.url
      });
      this.props.previewTilemap(this.props.url);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadUrl();
  }

  render() {

    if (this.state.url === null) {
      return null;
    }

    return (
      <EuiFormRow
        label="Tilemap url"
        helpText={this.state.url ? null : NO_TILEMAP_LAYER_MSG}
      >
        <EuiFieldText
          readOnly
          value={this.state.url}
        />
      </EuiFormRow>
    );
  }
}

CreateSourceEditor.propTypes = {
  previewTilemap: PropTypes.func.isRequired
};
