/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './collapsible_panel.scss';

import type { IconType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { Component, Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  iconType?: IconType;
  title: string | ReactNode;
  initiallyCollapsed?: boolean;
}

interface State {
  collapsed: boolean;
}

export class CollapsiblePanel extends Component<Props, State> {
  public state = {
    collapsed: false,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      collapsed: props.initiallyCollapsed || false,
    };
  }

  public render() {
    return (
      <EuiPanel hasShadow={false} hasBorder={true}>
        {this.getTitle()}
        {this.getForm()}
      </EuiPanel>
    );
  }

  public getTitle = () => {
    return (
      <EuiFlexGroup alignItems={'baseline'} gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              {this.props.iconType && (
                <Fragment>
                  <EuiIcon
                    type={this.props.iconType}
                    size={'xl'}
                    className={'collapsiblePanel__logo'}
                  />{' '}
                </Fragment>
              )}
              {this.props.title}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink data-test-subj="showHidePrivilege" onClick={this.toggleCollapsed}>
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
