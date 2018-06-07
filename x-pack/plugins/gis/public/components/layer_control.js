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

export class LayerControl extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      layers: []
    };
    this._onLayerOrderChange = (newOrder) => {
      this._kbnMap.reorderLayers(newOrder);
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
    this._kbnMap.on('layer:visibilityChanged', syncLayers);
    this._kbnMap.on('layer:removed', syncLayers);
    this._kbnMap.on('layers:reordered', syncLayers);
  }

  render() {
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
              <LayerTOC layers={this.state.layers} layerOrderChange={this._onLayerOrderChange}/>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </div>
    );
  }
}

