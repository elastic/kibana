/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StyleTabs } from './style_tabs';
import { JoinEditor } from './join_editor';
import { FlyoutFooter } from './flyout_footer';

import {
  EuiHorizontalRule,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
} from '@elastic/eui';
import { ALayer } from '../../shared/layers/layer';

export class LayerPanel  extends React.Component {

  constructor() {
    super();
    this.state = {
      displayName: null
    };
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }


  _renderGlobalSettings() {

    if (!this.props.selectedLayer) {
      return null;
    }

    // if (this.state.displayName === null) {
    //   return null;
    // }

    const layerSettings =  ALayer.renderGlobalSettings({
      label: this.props.selectedLayer.getLabel(),
      onLabelChange: (label) => {
        this.props.updateLabel(this.props.selectedLayer.getId(), label);
      },
      minZoom: this.props.selectedLayer.getMinZoom(),
      maxZoom: this.props.selectedLayer.getMaxZoom(),
      onMinZoomChange: (zoom) => {
        this.props.updateMinZoom(this.props.selectedLayer.getId(), zoom);
      },
      onMaxZoomChange: (zoom) => {
        this.props.updateMaxZoom(this.props.selectedLayer.getId(), zoom);
      }
    });

    const frags = (
      <EuiPanel>
        <EuiTitle size="xs"><h5>Layer settings</h5></EuiTitle>
        <EuiSpacer margin="m"/>
        {layerSettings}
      </EuiPanel>);

    return frags;

  }

  _renderJoinSection() {
    return this.props.selectedLayer.isJoinable() ?
      (
        <EuiPanel>
          <JoinEditor layer={this.props.selectedLayer}/>
        </EuiPanel>
      ) : null;
  }

  render() {

    const displayName = this.props.selectedLayer.getDisplayName();
    Promise.all([displayName]).then(labels => {
      if (this._isMounted) {
        if (labels[0] !== this.state.displayName) {
          this.setState({
            displayName: labels[0]
          });
        }
      }
    });

    const { selectedLayer } = this.props;
    if (!selectedLayer) {
      //todo: temp placeholder to bypass state-bug
      return (<div/>);
    }

    const globalLayerSettings = this._renderGlobalSettings();
    const joinSection = this._renderJoinSection();

    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
      >
        <EuiFlexItem grow={false} className="gisViewPanel__header">
          <EuiTitle size="s" className="gisViewPanel__title">
            <p>
              <h1>
                {selectedLayer.getIcon()}
                {this.state.displayName}
              </h1>
            </p>
          </EuiTitle>
          <EuiSpacer size="m"/>
          <EuiHorizontalRule margin="none"/>
        </EuiFlexItem>

        <EuiFlexItem className="gisViewPanel__body">
          {globalLayerSettings}
          {joinSection}
          <StyleTabs layer={selectedLayer}/>
          {selectedLayer.renderSourceDetails()}
        </EuiFlexItem>

        <EuiFlexItem grow={false} className="gisViewPanel__footer">
          <EuiHorizontalRule margin="none"/>
          <EuiSpacer size="m"/>
          <FlyoutFooter/>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
