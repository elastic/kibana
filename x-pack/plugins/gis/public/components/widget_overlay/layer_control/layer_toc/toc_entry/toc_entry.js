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
  EuiLoadingSpinner,
  EuiToolTip,
  EuiIconTip,
  EuiSpacer
} from '@elastic/eui';
import { VisibilityToggle } from '../../../../../shared/components/visibility_toggle';

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

  _renderVisibilityToggle() {
    const { layer, toggleVisible } = this.props;
    return (
      <VisibilityToggle
        id={layer.getId()}
        checked={layer.isVisible()}
        onChange={() => toggleVisible(layer.getId())}
        size={'l'}
      >
        {layer.getIcon()}
      </VisibilityToggle>
    );
  }

  render() {

    const { layer, openLayerPanel, zoom } = this.props;

    const displayName = layer.getDisplayName();
    Promise.resolve(displayName).then(label => {
      if (this._isMounted) {
        if (label !== this.state.displayName) {
          this.setState({
            displayName: label
          });
        }
      }
    });

    let visibilityIndicator;
    if (layer.dataHasLoadError()) {
      visibilityIndicator = (
        <EuiIconTip
          aria-label="Load warning"
          size="m"
          type="alert"
          color="warning"
          content={layer.getDataLoadError()}
        />
      );
    } else if (layer.isLayerLoading()) {
      visibilityIndicator = <EuiLoadingSpinner size="m"/>;
    } else if (!layer.showAtZoomLevel(zoom)) {
      const { minZoom, maxZoom } = layer.getZoomConfig();
      visibilityIndicator = (
        <EuiToolTip
          position="left"
          content={`Map is at zoom level ${zoom}.
          This layer is only visible between zoom levels ${minZoom} to ${maxZoom}.`}
        >
          {this._renderVisibilityToggle()}
        </EuiToolTip>
      );
    } else {
      visibilityIndicator = this._renderVisibilityToggle();
    }

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
            {visibilityIndicator}
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
