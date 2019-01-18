/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { StyleTabs } from './style_tabs';
import { JoinEditor } from './join_editor';
import { FlyoutFooter } from './flyout_footer';
import { SettingsPanel } from './settings_panel';

import {
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
} from '@elastic/eui';

export class LayerPanel  extends React.Component {

  state = {
    displayName: null
  }

  componentDidMount() {
    this._isMounted = true;
    this.loadDisplayName();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  loadDisplayName = async () => {
    const displayName = await this.props.selectedLayer.getDisplayName();
    if (this._isMounted) {
      this.setState({ displayName });
    }
  }

  _renderJoinSection() {
    if (!this.props.selectedLayer.isJoinable()) {
      return null;
    }

    return (
      <Fragment>
        <EuiPanel>
          <JoinEditor/>
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  render() {
    const { selectedLayer } = this.props;

    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
      >
        <EuiFlyoutHeader hasBorder className="gisLayerPanel__header">
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              {selectedLayer.getIcon()}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>{this.state.displayName}</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>

        <EuiFlyoutBody className="gisLayerPanel__body">
          <SettingsPanel/>
          <EuiSpacer size="s" />
          {this._renderJoinSection()}
          <StyleTabs layer={selectedLayer}/>
        </EuiFlyoutBody>

        <EuiFlyoutFooter className="gisLayerPanel__footer">
          <FlyoutFooter/>
        </EuiFlyoutFooter>
      </EuiFlexGroup>
    );
  }
}
