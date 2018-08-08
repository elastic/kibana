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

export class LayerControl extends React.Component {

  constructor(props) {
    super(props);
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
              <LayerTOC
                layerOrderChange={this._onLayerOrderChange}
                showLayerDetails={this._showLayerDetails}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        {layerFlyout}
      </div>
    );
  }
}

