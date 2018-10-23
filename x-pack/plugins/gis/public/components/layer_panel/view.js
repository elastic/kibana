/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { StyleTabs } from './style_tabs';
import { JoinEditor } from './join_editor';
import { FlyoutFooter } from './flyout_footer';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiHorizontalRule,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
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
      <Fragment>
        <EuiTitle size="s"><h2><strong>Settings</strong></h2></EuiTitle>
        <EuiSpacer size="l"/>
        {layerSettings}
        <EuiSpacer size="l"/>
      </Fragment>);

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

    const { selectedLayer, cancelLayerPanel } = this.props;
    if (!selectedLayer) {
      //todo: temp placeholder to bypass state-bug
      return (<div/>);
    }

    const globalLayerSettings = this._renderGlobalSettings();
    const joinSection = this._renderJoinSection();

    return (
      <EuiFlyout
        onClose={cancelLayerPanel}
        style={{ maxWidth: 768 }}
      >
        <EuiFlyoutHeader>
          <EuiTitle size="s">
            <h1>{this.state.displayName}</h1>
          </EuiTitle>
          <EuiSpacer size="m"/>
          <EuiSpacer/>

          <div>
            {selectedLayer.renderSourceDetails()}
          </div>
          <EuiSpacer/>
          <EuiHorizontalRule margin="none"/>
        </EuiFlyoutHeader>

        <EuiFlyoutBody style={{ paddingTop: 0 }}>
          {globalLayerSettings}
          <EuiSpacer size="l"/>
          {joinSection}
          <EuiSpacer size="l"/>
          <StyleTabs layer={selectedLayer}/>
          <EuiSpacer size="l"/>
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <FlyoutFooter/>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
