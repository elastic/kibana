/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';

interface Props {
  iconType: string | any;
  title: string;
}

interface State {
  collapsed: boolean;
}

export class CollapsiblePanel extends Component<Props, State> {
  public state = {
    collapsed: false,
  };

  public render() {
    return (
      <EuiPanel>
        {this.getTitle()}
        {this.getForm()}
      </EuiPanel>
    );
  }

  public getTitle = () => {
    return (
      // @ts-ignore
      <EuiFlexGroup alignItems={'baseline'} gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              <EuiIcon
                type={this.props.iconType}
                size={'xl'}
                className={'collapsiblePanel__logo'}
              />{' '}
              {this.props.title}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink onClick={this.toggleCollapsed}>
            {this.state.collapsed ? (
              <FormattedMessage
                id="xpack.security.management.editRole.collapsiblePanel.showLinkText"
                defaultMessage="show"
              />
            ) : (
              <FormattedMessage
                id="xpack.security.management.editRole.collapsiblePanel.hideLinkText"
                defaultMessage="hide"
              />
            )}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  public getForm = () => {
    if (this.state.collapsed) {
      return null;
    }

    return (
      <Fragment>
        <EuiSpacer />
        {this.props.children}
      </Fragment>
    );
  };

  public toggleCollapsed = () => {
    this.setState({
      collapsed: !this.state.collapsed,
    });
  };
}
