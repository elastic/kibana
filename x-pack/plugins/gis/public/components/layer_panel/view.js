/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StyleTabs } from './style_tabs';
import { JoinEditor } from './join_editor';
import { FlyoutFooter } from './flyout_footer';
import { SettingsPanel } from './settings_panel';

import {
  EuiHorizontalRule,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
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
      <EuiPanel>
        <JoinEditor/>
      </EuiPanel>
    );
  }

  render() {
    const { selectedLayer } = this.props;

    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
      >
        <EuiFlexItem grow={false} className="gisViewPanel__header">
          <EuiTitle size="s" className="gisViewPanel__title">
            <h1>
              {selectedLayer.getIcon()}
              {this.state.displayName}
            </h1>
          </EuiTitle>
          <EuiSpacer size="m"/>
          <EuiHorizontalRule margin="none"/>
        </EuiFlexItem>

        <EuiFlexItem className="gisViewPanel__body">
          <SettingsPanel/>
          {this._renderJoinSection()}
          <StyleTabs layer={selectedLayer}/>
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
