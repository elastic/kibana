/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { RenderWizardArguments } from '../../layer_wizard_registry';
import { LayerSelect, OBSERVABILITY_LAYER_TYPE } from './layer_select';
import { MetricSelect, OBSERVABILITY_METRIC_TYPE } from './metric_select';

interface State {
  layer: OBSERVABILITY_LAYER_TYPE | null;
  metric: OBSERVABILITY_METRIC_TYPE | null;
}

export class ObservabilityLayerTemplate extends Component<RenderWizardArguments, State> {
  state = {
    layer: null,
    metric: null,
  };

  _onLayerChange = (layer: OBSERVABILITY_LAYER_TYPE) => {
    this.setState({ layer }, this._previewLayer);
  };

  _onMetricChange = (metric: OBSERVABILITY_METRIC_TYPE) => {
    this.setState({ metric }, this._previewLayer);
  };

  _previewLayer() {}

  render() {
    return (
      <Fragment>
        <LayerSelect value={this.state.layer} onChange={this._onLayerChange} />
        <MetricSelect
          layer={this.state.layer}
          value={this.state.metric}
          onChange={this._onMetricChange}
        />
      </Fragment>
    );
  }
}
