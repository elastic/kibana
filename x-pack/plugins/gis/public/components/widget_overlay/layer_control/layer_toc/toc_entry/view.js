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

export class TOCEntry extends React.Component {

  constructor() {
    super();
    this.state = {
      displayName: null };
  }

  componentDidMount() {
    this._isMounted = true;
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

    const { layer, openLayerPanel, zoom, toggleVisible } = this.props;

    const smallIcon = layer.renderSmallTocIcon({ toggleVisible, zoom });
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
        className="gisTocEntry"
        id={layer.getId()}
        data-layerid={layer.getId()}
      >
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={false}
          className={
            layer.isVisible() && layer.showAtZoomLevel(zoom) && !layer.dataHasLoadError() ? 'gisTocEntry-visible' : 'gisTocEntry-notVisible'
          }
        >
          <EuiFlexItem grow={false}>
            { smallIcon }
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
            <span className="gisTocEntry__grab"><EuiIcon type="grab"/></span>
          </EuiFlexItem>
        </EuiFlexGroup>
        {tocDetails}
      </div>
    );
  }

}
