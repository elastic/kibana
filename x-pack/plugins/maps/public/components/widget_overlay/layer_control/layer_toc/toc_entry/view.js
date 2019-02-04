/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer
} from '@elastic/eui';
import { LayerTocActions } from '../../../../../shared/components/layer_toc_actions';

export class TOCEntry extends React.Component {

  state = {
    displayName: null
  }

  componentDidMount() {
    this._isMounted = true;
    this._updateDisplayName();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _updateDisplayName() {
    const label = await this.props.layer.getDisplayName();
    if (this._isMounted) {
      if (label !== this.state.displayName) {
        this.setState({
          displayName: label
        });
      }
    }
  }

  componentDidUpdate() {
    this._updateDisplayName();
  }

  render() {

    const { layer, openLayerPanel, zoom, toggleVisible, fitToBounds } = this.props;
    const legendIcon = (
      <LayerTocActions
        layer={layer}
        fitToBounds={() => {
          fitToBounds(layer.getId());
        }}
        zoom={zoom}
        toggleVisible={() => {
          toggleVisible(layer.getId());
        }}
      />
    );
    let tocDetails = layer.getTOCDetails();
    if (tocDetails) {
      tocDetails = (
        <EuiFlexItem>
          <EuiSpacer size="s"/>
          {tocDetails}
        </EuiFlexItem>
      );
    }

    return (
      <div
        className="mapTocEntry"
        id={layer.getId()}
        data-layerid={layer.getId()}
      >
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          responsive={false}
          className={
            layer.isVisible() && layer.showAtZoomLevel(zoom)
              && !layer.hasErrors() ? 'mapTocEntry-visible' : 'mapTocEntry-notVisible'
          }
        >
          <EuiFlexItem grow={false}>
            { legendIcon }
          </EuiFlexItem>
          <EuiFlexItem>
            <button
              onClick={() => openLayerPanel(layer.getId())}
              data-test-subj={`mapOpenLayerButton${this.state.displayName}`}
            >
              <div style={{ width: 180 }} className="eui-textTruncate eui-textLeft">
                {this.state.displayName}
              </div>
            </button>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span className="mapTocEntry__grab"><EuiIcon type="grab"/></span>
          </EuiFlexItem>
        </EuiFlexGroup>
        {tocDetails}
      </div>
    );
  }

}
