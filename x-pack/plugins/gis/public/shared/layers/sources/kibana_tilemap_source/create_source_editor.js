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

const NO_TILEMAP_LAYER_MSG =
  'No tilemap layer is available.' +
  ' Ask your system administrator to set "map.tilemap.url" in kibana.yml.';

export class CreateSourceEditor extends Component {

  componentDidMount() {
    if (this.props.url) {
      this.props.previewTilemap(this.props.url);
    }
  }

  render() {
    return (
      <EuiFormRow
        label="Tilemap url"
        helpText={this.props.url ? null : NO_TILEMAP_LAYER_MSG}
      >
        <EuiFieldText
          readOnly
          value={this.props.url}
        />
      </EuiFormRow>
    );
  }
}

CreateSourceEditor.propTypes = {
  previewTilemap: PropTypes.func.isRequired,
  url: PropTypes.string,
};
