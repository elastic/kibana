/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiPanel } from '@elastic/eui';
import { RenderWizardArguments } from '../../layer_wizard_registry';
import { IndexPatternSelect } from './index_pattern_select';
import { createSecurityLayerDescriptors } from './create_layer_descriptors';
import { IndexPatternMeta } from './security_index_pattern_utils';

interface State {
  indexPatternId: string | null;
  indexPatternTitle: string | null;
}

export class SecurityLayerTemplate extends Component<RenderWizardArguments, State> {
  state = {
    indexPatternId: null,
    indexPatternTitle: null,
  };

  _onIndexPatternChange = (indexPatternMeta: IndexPatternMeta | null) => {
    this.setState(
      {
        indexPatternId: indexPatternMeta ? indexPatternMeta.id : null,
        indexPatternTitle: indexPatternMeta ? indexPatternMeta.title : null,
      },
      this._previewLayer
    );
  };

  _previewLayer() {
    if (!this.state.indexPatternId || !this.state.indexPatternTitle) {
      this.props.previewLayers([]);
      return;
    }

    this.props.previewLayers(
      createSecurityLayerDescriptors(this.state.indexPatternId!, this.state.indexPatternTitle!)
    );
  }

  render() {
    return (
      <EuiPanel>
        <IndexPatternSelect
          value={this.state.indexPatternId ? this.state.indexPatternId! : ''}
          onChange={this._onIndexPatternChange}
        />
      </EuiPanel>
    );
  }
}
