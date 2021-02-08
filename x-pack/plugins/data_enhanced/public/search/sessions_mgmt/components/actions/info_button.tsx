/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import { UISession } from '../../types';
import { TableText } from '../';
import { CodeEditor } from '../../../../../../../../src/plugins/kibana_react/public';
import './info_button.scss';

interface Props {
  searchSession: UISession;
}

interface State {
  isLoading: boolean;
  isFlyoutVisible: boolean;
  calloutTitle: string;
}

export class InfoButton extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isLoading: false,
      isFlyoutVisible: false,
      calloutTitle: 'Search Session Info',
    };

    this.closeFlyout = this.closeFlyout.bind(this);
    this.showFlyout = this.showFlyout.bind(this);
  }

  public renderInfo() {
    return (
      <Fragment>
        <CodeEditor
          languageId="json"
          value={JSON.stringify(this.props.searchSession.initialState, null, 2)}
          onChange={() => {}}
          options={{
            readOnly: true,
            lineNumbers: 'off',
            fontSize: 12,
            minimap: {
              enabled: false,
            },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
          }}
        />
      </Fragment>
    );
  }

  public render() {
    let flyout;

    if (this.state.isFlyoutVisible) {
      flyout = (
        <EuiPortal>
          <EuiFlyout
            ownFocus
            onClose={this.closeFlyout}
            size="s"
            aria-labelledby="flyoutTitle"
            data-test-subj="searchSessionsFlyout"
            className="searchSessionsFlyout"
          >
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="m">
                <h2 id="flyoutTitle">{this.state.calloutTitle}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <EuiText>
                <EuiText size="xs">
                  <p>
                    <FormattedMessage
                      id="xpack.data.sessions.management.flyoutText"
                      defaultMessage="Original configuration used to create the search session:"
                    />
                  </p>
                </EuiText>
                <EuiSpacer />
                {this.renderInfo()}
              </EuiText>
            </EuiFlyoutBody>
          </EuiFlyout>
        </EuiPortal>
      );
    }

    return (
      <Fragment>
        <TableText onClick={this.showFlyout}>
          <FormattedMessage
            id="xpack.data.mgmt.searchSessions.actionInfo"
            aria-label="Show search session info"
            defaultMessage="Info"
          />
        </TableText>
        {flyout}
      </Fragment>
    );
  }

  private closeFlyout = () => {
    this.setState({
      isFlyoutVisible: false,
    });
  };

  private showFlyout = () => {
    this.setState({ isFlyoutVisible: true });
  };
}
