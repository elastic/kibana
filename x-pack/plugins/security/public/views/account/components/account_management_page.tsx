/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiAvatar,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPanel,
  EuiSideNav,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { ChangePassword } from './change_password';
import { PersonalInfoPanel } from './personal_info_panel';
import { SecurityPanel } from './security_panel';

interface Props {
  user: any;
  showChangePassword: boolean;
}

type AccountPanel = 'info' | 'security';

interface State {
  activePanel: AccountPanel;
}

export class AccountManagementPage extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      activePanel: 'info',
    };
  }

  public render() {
    return (
      <EuiPage>
        <EuiPageBody>
          <div className="eui-textCenter">
            <EuiText>
              <h2>Welcome, {this.props.user.full_name || this.props.user.username}</h2>
            </EuiText>
            <EuiText>
              <h3>Manage your account</h3>
            </EuiText>
          </div>
          <EuiSpacer />
          <EuiFlexGroup direction="row" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>{this.getMenu()}</EuiFlexItem>
            <EuiFlexItem grow>
              <EuiPanel>{this.getActivePanel()}</EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPage>
    );
  }

  private getMenu() {
    return (
      <EuiSideNav
        items={[
          {
            id: 'account',
            name: 'Account',
            // @ts-ignore
            icon: (
              <EuiAvatar
                size={'s'}
                type="user"
                name={this.props.user.fullName || this.props.user.username}
              />
            ),
            items: [
              {
                id: 'info',
                name: 'Personal Information',
                // @ts-ignore
                isSelected: this.state.activePanel === 'info',
                onClick: () => this.showPanel('info'),
              },
              {
                id: 'security',
                name: 'Security',
                // @ts-ignore
                isSelected: this.state.activePanel === 'security',
                onClick: () => this.showPanel('security'),
              },
            ],
          },
        ]}
      />
    );
  }

  private showPanel = (activePanel: AccountPanel) => {
    this.setState({ activePanel });
  };

  private getActivePanel = () => {
    switch (this.state.activePanel) {
      case 'info':
        return <PersonalInfoPanel user={this.props.user} />;
      case 'security':
        return <SecurityPanel user={this.props.user} />;
      default:
        return <div />;
    }
  };
}
