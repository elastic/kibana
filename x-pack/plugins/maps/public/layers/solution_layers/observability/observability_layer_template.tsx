/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ChangeEvent, Fragment } from 'react';
import {
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RenderWizardArguments } from '../../layer_wizard_registry';
import { ObservabilityLayerSelect, OBSERVABILITY_LAYER_TYPE } from './observability_layer_select';

interface State {
  layer?: OBSERVABILITY_LAYER_TYPE;
}

export class ObservabilityLayerTemplate extends Component<RenderWizardArguments, State> {

  state = {}

  _onLayerChange = (layer: OBSERVABILITY_LAYER_TYPE) => {
    this.setState({ layer });
  };

  render() {
    return (
      <Fragment>
        <ObservabilityLayerSelect value={this.state.layer} onChange={this._onLayerChange} />
      </Fragment>
    );
  }
}
