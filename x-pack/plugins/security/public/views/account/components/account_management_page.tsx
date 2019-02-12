/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiPageBody, EuiText } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { getUserDisplayName, User } from '../../../../common/model/user';
import { AccountSection } from './account_section';
import { PersonalInfoPanel } from './personal_info_panel';
import { SecurityPanel } from './security_panel';

interface Props {
  user: User;
}

export class AccountManagementPage extends Component<Props, {}> {
  constructor(props: Props) {
    super(props);
  }

  public render() {
    return (
      <EuiPage>
        <EuiPageBody restrictWidth>
          <EuiText textAlign="center">
            <h2>
              <FormattedMessage
                id="xpack.security.account.welcomeMessage"
                defaultMessage="Welcome, {displayName}"
                values={{
                  displayName: getUserDisplayName(this.props.user),
                }}
              />
            </h2>
            <h3>
              <FormattedMessage
                id="xpack.security.account.manageAccountText"
                defaultMessage="Manage your account settings"
              />
            </h3>
          </EuiText>
          <EuiSpacer />

          <EuiFlexGroup>
            <EuiFlexItem>
              <AccountSection
                iconType={'wrench'}
                title={
                  <FormattedMessage
                    id="xpack.security.account.personalInfoTabName"
                    defaultMessage="Personal Info"
                  />
                }
              >
                <PersonalInfoPanel user={this.props.user} />
              </AccountSection>
            </EuiFlexItem>
            <EuiFlexItem>
              <AccountSection
                iconType={'lock'}
                title={
                  <FormattedMessage
                    id="xpack.security.account.securityTabName"
                    defaultMessage="Security"
                  />
                }
              >
                <SecurityPanel user={this.props.user} />
              </AccountSection>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
