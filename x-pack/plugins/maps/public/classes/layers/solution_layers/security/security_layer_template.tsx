/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { IndexPattern } from 'src/plugins/data/public';
import { RenderWizardArguments } from '../../layer_wizard_registry';
import { IndexPatternSelect } from './index_pattern_select';
import { createLayerDescriptors } from './create_layer_descriptors';

interface State {
  indexPattern: IndexPattern | undefined;
}

export class SecurityLayerTemplate extends Component<RenderWizardArguments, State> {
  state = {
    indexPattern: undefined,
  };

  _onIndexPatternChange = (indexPattern: IndexPattern | undefined) => {
    this.setState({ indexPattern }, this._previewLayer);
  };

  _previewLayer() {
    if (!this._hasIndexPattern()) {
      this.props.previewLayers([]);
      return;
    }

    this.props.previewLayers(
      createLayerDescriptors(this.state.indexPattern!.id, this.state.indexPattern!.title)
    );
  }

  _hasIndexPattern() {
    return !!this.state.indexPattern;
  }

  render() {
    return (
      <Fragment>
        <IndexPatternSelect
          value={this._hasIndexPattern() ? this.state.indexPattern!.id : ''}
          onChange={this._onIndexPatternChange}
        />
      </Fragment>
    );
  }
}
