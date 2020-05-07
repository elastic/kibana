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
import { i18n } from '@kbn/i18n';
import React, { Component, Fragment, ReactNode } from 'react';

interface Props {
  iconType?: IconType;
  title: string | ReactNode;
  description: string;
  collapsible: boolean;
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
    const showLinkText = i18n.translate('xpack.spaces.management.collapsiblePanel.showLinkText', {
      defaultMessage: 'show',
    });

    const hideLinkText = i18n.translate('xpack.spaces.management.collapsiblePanel.hideLinkText', {
      defaultMessage: 'hide',
    });

    const showLinkDescription = i18n.translate(
      'xpack.spaces.management.collapsiblePanel.showLinkDescription',
      {
        defaultMessage: 'show {title}',
        values: { title: this.props.description },
      }
    );

    const hideLinkDescription = i18n.translate(
      'xpack.spaces.management.collapsiblePanel.hideLinkDescription',
      {
        defaultMessage: 'hide {title}',
        values: { title: this.props.description },
      }
    );

    return (
      <EuiFlexGroup alignItems={'baseline'} gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
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
