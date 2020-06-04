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
    if (!this.state.indexPattern) {
      this.props.previewLayers([]);
      return;
    }

    this.props.previewLayers(
      // @ts-ignore - avoid wrong "Property does not exist on type 'never'." compile error
      createLayerDescriptors(this.state.indexPattern.id, this.state.indexPattern.title)
    );
  }

  render() {
    return (
      <Fragment>
        <IndexPatternSelect
          // @ts-ignore - avoid wrong "Property does not exist on type 'never'." compile error
          value={this.state.indexPattern ? this.state.indexPattern.id : ''}
          onChange={this._onIndexPatternChange}
        />
      </Fragment>
    );
  }
}
