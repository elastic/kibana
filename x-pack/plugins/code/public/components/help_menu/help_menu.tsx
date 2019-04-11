/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import chrome from 'ui/chrome';
import { EuiButton, EuiHorizontalRule, EuiText, EuiSpacer, EuiPortal } from '@elastic/eui';
import { documentationLinks } from '../../lib/documentation_links';

export class HelpMenu extends React.PureComponent {
  state = { isFlyoutVisible: false };

  showFlyout = () => {
    this.setState({ isFlyoutVisible: true });
  };

  hideFlyout = () => {
    this.setState({ isFlyoutVisible: false });
  };

  public render() {
    return (
      <React.Fragment>
        <EuiHorizontalRule margin="none" />
        <EuiSpacer />
        <EuiText size="s">
          <p>For Code specific information</p>
        </EuiText>
        <EuiSpacer />
        <EuiButton fill iconType="popout" href={chrome.addBasePath('/app/code#/setup-guide')}>
          Setup Guide
        </EuiButton>
        <EuiSpacer />
        <EuiButton fill iconType="popout" href={documentationLinks.code} target="_blank">
          Code documentation
        </EuiButton>

        {
          // TODO: add shortcut information
          /*
          <EuiSpacer />
          <EuiButton onClick={this.showFlyout} target="_blank">
            Keyboard shortcuts
          </EuiButton>
          {this.state.isFlyoutVisible && (
          <EuiPortal>
            <ShortcutsProvider onClose={this.hideFlyout} />
          </EuiPortal>
        )} */
        }
      </React.Fragment>
    );
  }
}
