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
  EuiButtonEmpty,
  EuiTitle
} from '@elastic/eui';

import { LayerTOC } from '../layer_toc';
import { LayerPanel } from '../layer_panel';

const FLYOUT_STATE = {
  NONE: 'NONE',
  LAYER_PANEL: 'LAYER_PANEL',
  ADD_LAYER_WIZARD: 'ADD_LAYER_WIZARD'
};

export class LayerControl extends React.Component {

  constructor(props) {
    super(props);
    this._kbnMap = props.kbnMap;

    this._onLayerOrderChange = (newOrder) => {
      this._kbnMap.reorderLayers(newOrder);
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
    const {
      layerDetailsVisible,
      addLayerVisible,
      noFlyoutVisible
    } = this.props;

    if (noFlyoutVisible) {
      return null;
    } else if (addLayerVisible) {
      return null; //todo
    } else if (layerDetailsVisible) {
      return (
        <LayerPanel
          removeLayer={this._removeLayer}
        />);
    }
  }

  render() {
    const layerFlyout = this._renderLayerFlyout();
    const addLayer = (
      <EuiButtonEmpty size="xs" flush="right" onClick={this.props.showAddLayerWizard}>
        Add layer
      </EuiButtonEmpty>);
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
            <EuiFlexItem grow={false}>
              {addLayer}
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

export default LayerControl;

