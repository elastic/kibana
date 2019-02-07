/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiSideNav,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { getUserDisplayName, User } from '../../../../common/model/user';
import { PersonalInfoPanel } from './personal_info_panel';
import { SecurityPanel } from './security_panel';

interface Props {
  user: User;
}

type AccountPanel = 'info' | 'security';

interface State {
  activePanel: AccountPanel;
  isOpenOnMobile: boolean;
}

export class AccountManagementPage extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      activePanel: 'info',
      isOpenOnMobile: false,
    };
  }

  public render() {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiFlexGroup direction="row" justifyContent="spaceBetween">
            <EuiFlexItem grow={1}>
              <div style={{ marginTop: '75px' }}>{this.getMenu()}</div>
            </EuiFlexItem>
            <EuiFlexItem grow={4}>
              <div style={{ maxWidth: '1000px' }}>
                <div className="eui-textCenter" style={{ height: '75px' }}>
                  <EuiText>
                    <h2>
                      <FormattedMessage
                        id="xpack.security.account.welcomeMessage"
                        defaultMessage="Welcome, {displayName}"
                        values={{
                          displayName: getUserDisplayName(this.props.user),
                        }}
                      />
                    </h2>
                  </EuiText>
                  <EuiText>
                    <h3>Manage your account</h3>
                  </EuiText>
                </div>
                <EuiPanel style={{ margin: '0 auto' }}>{this.getActivePanel()}</EuiPanel>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPage>
    );
  }

  private getMenu() {
    return (
      <EuiSideNav
        mobileTitle="Account settings"
        isOpenOnMobile={this.state.isOpenOnMobile}
        toggleOpenOnMobile={() => this.setState({ isOpenOnMobile: !this.state.isOpenOnMobile })}
        items={[
          {
            id: 'account',
            name: 'Account',
            // @ts-ignore
            icon: <EuiAvatar size={'s'} type="user" name={getUserDisplayName(this.props.user)} />,
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
