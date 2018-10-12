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
import { injectI18n } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import './collapsible_panel.less';

interface Props {
  iconType: string | any;
  title: string;
}

interface State {
  collapsed: boolean;
}

export class CollapsiblePanelUI extends Component<Props, State> {
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
    const { intl } = this.props;

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
            {this.state.collapsed
              ? intl.formatMessage({
                  id:
                    'xpack.security.views.management.editRoles.components.collapsiblePanel.showTitle',
                  defaultMessage: 'show',
                })
              : intl.formatMessage({
                  id:
                    'xpack.security.views.management.editRoles.components.collapsiblePanel.hideTitle',
                  defaultMessage: 'hide',
                })}
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

export const CollapsiblePanel = injectI18n(CollapsiblePanelUI);
