/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiPanel } from '@elastic/eui';
import { RenderWizardArguments } from '../../layer_wizard_registry';
import { LayerSelect, OBSERVABILITY_LAYER_TYPE } from './layer_select';
import { getMetricOptionsForLayer, MetricSelect, OBSERVABILITY_METRIC_TYPE } from './metric_select';
import { DisplaySelect, DISPLAY } from './display_select';
import { createLayerDescriptor } from './create_layer_descriptor';

interface State {
  display: DISPLAY;
  layer: OBSERVABILITY_LAYER_TYPE | null;
  metric: OBSERVABILITY_METRIC_TYPE | null;
}

export class ObservabilityLayerTemplate extends Component<RenderWizardArguments, State> {
  state = {
    layer: null,
    metric: null,
    display: DISPLAY.CHOROPLETH,
  };

  _onLayerChange = (layer: OBSERVABILITY_LAYER_TYPE) => {
    const newState = { layer, metric: this.state.metric };

    // Select metric when layer change invalidates selected metric.
    const metricOptions = getMetricOptionsForLayer(layer);
    const selectedMetricOption = metricOptions.find((option) => {
      return option.value === this.state.metric;
    });
    if (!selectedMetricOption) {
      if (metricOptions.length) {
        // @ts-ignore
        newState.metric = metricOptions[0].value;
      } else {
        newState.metric = null;
      }
    }

    this.setState(newState, this._previewLayer);
  };

  _onMetricChange = (metric: OBSERVABILITY_METRIC_TYPE) => {
    this.setState({ metric }, this._previewLayer);
  };

  _onDisplayChange = (display: DISPLAY) => {
    this.setState({ display }, this._previewLayer);
  };

  _previewLayer() {
    const layerDescriptor = createLayerDescriptor({
      layer: this.state.layer,
      metric: this.state.metric,
      display: this.state.display,
    });
    this.props.previewLayers(layerDescriptor ? [layerDescriptor] : []);
  }

  render() {
    return (
      <EuiPanel>
        <LayerSelect value={this.state.layer} onChange={this._onLayerChange} />
        <MetricSelect
          layer={this.state.layer}
          value={this.state.metric}
          onChange={this._onMetricChange}
        />
        <DisplaySelect
          layer={this.state.layer}
          value={this.state.display}
          onChange={this._onDisplayChange}
        />
      </EuiPanel>
    );
  }
}
