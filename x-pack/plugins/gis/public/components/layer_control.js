/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle
} from '@elastic/eui';

import { LayerTOC } from './layer_toc';
import { LayerPanel } from './layer_panel';

const FLYOUT_STATE = {
  NONE: 'NONE',
  LAYER_PANEL: 'LAYER_PANEL',
  ADD_LAYER_WIZARD: 'ADD_LAYER_WIZARD'
};

export class LayerControl extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      layers: [],
      flyoutState: FLYOUT_STATE.NONE
    };
    this._onLayerOrderChange = (newOrder) => {
      this._kbnMap.reorderLayers(newOrder);
    };
    this._showLayerDetails = (layer) => {
      this.setState({
        flyoutState: FLYOUT_STATE.LAYER_PANEL,
        selectedLayer: layer
      });
    };
    this._cancelLayerPanel = () => {
      this.setState({
        flyoutState: FLYOUT_STATE.NONE,
        selectedLayer: null
      });
    };
    this._saveLayerEdits = () => {
      //todo
      this.setState({
        flyoutState: FLYOUT_STATE.NONE,
        selectedLayer: null
      });
    };
    this._removeLayer = (layer) => {
      this._kbnMap.removeLayer(layer);
      this.setState({
        flyoutState: FLYOUT_STATE.NONE,
        selectedLayer: null
      });
    };
  }

  setKbnMap(kbnMap) {
    this._kbnMap = kbnMap;
    const syncLayers = () => {
      this.setState({
        layers: this._kbnMap.getLayers()
      });
    };
    this._kbnMap.on('layer:added', syncLayers);
    this._kbnMap.on('layer:removed', syncLayers);
    this._kbnMap.on('layer:visibilityChanged', syncLayers);
    this._kbnMap.on('layers:reordered', syncLayers);
  }

  _renderLayerFlyout() {
    if (this.state.flyoutState === FLYOUT_STATE.NONE) {
      return null;
    } else if (this.state.flyoutState === FLYOUT_STATE.ADD_LAYER_WIZARD) {
      return null; //todo
    } else if (this.state.flyoutState === FLYOUT_STATE.LAYER_PANEL) {
      return (
        <LayerPanel
          layer={this.state.selectedLayer}
          onCancel={this._cancelLayerPanel}
          saveLayerEdits={this._saveLayerEdits}
          removeLayer={this._removeLayer}
        />);
    }
  }

  render() {
    const layerFlyout = this._renderLayerFlyout();
    return (
      <div>
        <EuiPanel className="LayerControl" hasShadow paddingSize="none">
          <EuiFlexGroup
            className="LayerControl--header"
            justifyContent="spaceBetween"
            responsive={false}
            gutterSize="none"
          >
            <EuiFlexItem>
              <EuiTitle><h2>Layers</h2></EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem>
              <LayerTOC layers={this.state.layers} layerOrderChange={this._onLayerOrderChange} showLayerDetails={this._showLayerDetails}/>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        {layerFlyout}
      </div>
    );
  }
}

