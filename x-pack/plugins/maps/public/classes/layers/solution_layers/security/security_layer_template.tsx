/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { RenderWizardArguments } from '../../layer_wizard_registry';
import { IndexPatternSelect } from './index_pattern_select';

interface State {
  indexPatternId: string | null;
}

export class SecurityLayerTemplate extends Component<RenderWizardArguments, State> {
  state = {
    indexPatternId: null,
  };

  _onIndexPatternChange = (indexPatternId: string) => {
    this.setState({ indexPatternId }, this._previewLayer);
  };

  _previewLayer() {
    this.props.previewLayers([]);
  }

  render() {
    return (
      <Fragment>
        <IndexPatternSelect
          value={this.state.indexPatternId}
          onChange={this._onIndexPatternChange}
        />
      </Fragment>
    );
  }
}
