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
  EuiFlyout,
  EuiFlyoutBody,
  EuiHorizontalRule,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui';

export class LayerPanel  extends React.Component {

  constructor() {
    super();
    this.state = {
      displayName: null
    };
  }

  componentDidMount() {
    this._isMounted = true;
    const displayName = this.props.selectedLayer.getDisplayName();
    Promise.all([displayName]).then(labels => {
      if (this._isMounted) {
        this.setState({
          displayName: labels[0]
        });
      }
    });
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    const { selectedLayer, cancelLayerPanel } = this.props;
    if (!selectedLayer) {
      //todo: temp placeholder to bypass state-bug
      return (<div/>);
    }

    const joinSection = selectedLayer.isJoinable() ? (
      <EuiPanel>
        <JoinEditor layer={selectedLayer}/>
      </EuiPanel>
    ) : null;


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
