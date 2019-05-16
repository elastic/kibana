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
  IconType,
} from '@elastic/eui';
import { InjectedIntl } from '@kbn/i18n/react';
import React, { Component, Fragment, ReactNode } from 'react';

interface Props {
  iconType?: IconType;
  title: string | ReactNode;
  description: string;
  collapsible: boolean;
  intl: InjectedIntl;
  initiallyCollapsed?: boolean;
}

interface State {
  collapsed: boolean;
}

export class SectionPanel extends Component<Props, State> {
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
      <EuiPanel>
        {this.getTitle()}
        {this.getForm()}
      </EuiPanel>
    );
  }

  public getTitle = () => {
    const showLinkText = this.props.intl.formatMessage({
      id: 'xpack.spaces.management.collapsiblePanel.showLinkText',
      defaultMessage: 'show',
    });

    const hideLinkText = this.props.intl.formatMessage({
      id: 'xpack.spaces.management.collapsiblePanel.hideLinkText',
      defaultMessage: 'hide',
    });

    const showLinkDescription = this.props.intl.formatMessage(
      {
        id: 'xpack.spaces.management.collapsiblePanel.showLinkDescription',
        defaultMessage: 'show {title}',
      },
      {
        title: this.props.description,
      }
    );

    const hideLinkDescription = this.props.intl.formatMessage(
      {
        id: 'xpack.spaces.management.collapsiblePanel.hideLinkDescription',
        defaultMessage: 'hide {title}',
      },
      {
        title: this.props.description,
      }
    );

    return (
      // @ts-ignore
      <EuiFlexGroup alignItems={'baseline'} gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h3>
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
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        {this.props.collapsible && (
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="show-hide-section-link"
              onClick={this.toggleCollapsed}
              aria-label={this.state.collapsed ? showLinkDescription : hideLinkDescription}
            >
              {this.state.collapsed ? showLinkText : hideLinkText}
            </EuiLink>
          </EuiFlexItem>
        )}
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
