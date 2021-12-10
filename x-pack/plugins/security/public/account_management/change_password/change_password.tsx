/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup } from '@elastic/eui';
import React, { Component } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { NotificationsSetup } from 'src/core/public';

import type { AuthenticatedUser } from '../../../common/model';
import { canUserChangePassword } from '../../../common/model';
import type { UserAPIClient } from '../../management/users';
import { ChangePasswordForm } from '../../management/users/components/change_password_form';

export interface ChangePasswordProps {
  user: AuthenticatedUser;
}

export interface ChangePasswordPropsInternal extends ChangePasswordProps {
  userAPIClient: PublicMethodsOf<UserAPIClient>;
  notifications: NotificationsSetup;
}

export class ChangePassword extends Component<ChangePasswordPropsInternal, {}> {
  public render() {
    const canChangePassword = canUserChangePassword(this.props.user);

    const changePasswordTitle = (
      <FormattedMessage id="xpack.security.account.changePasswordTitle" defaultMessage="Password" />
    );

    if (canChangePassword) {
      return this.getChangePasswordForm(changePasswordTitle);
    }
    return this.getChangePasswordUnavailable(changePasswordTitle);
  }

  private getChangePasswordForm = (changePasswordTitle: React.ReactElement<any>) => {
    return (
      <EuiDescribedFormGroup
        fullWidth
        title={<h2>{changePasswordTitle}</h2>}
        description={
          <p>
            <FormattedMessage
              id="xpack.security.account.changePasswordDescription"
              defaultMessage="Change the password for your account."
            />
          </p>
        }
      >
        <ChangePasswordForm
          user={this.props.user}
          isUserChangingOwnPassword={true}
          userAPIClient={this.props.userAPIClient}
          notifications={this.props.notifications}
        />
      </EuiDescribedFormGroup>
    );
  };

  private getChangePasswordUnavailable(changePasswordTitle: React.ReactElement<any>) {
    return (
      <EuiDescribedFormGroup
        fullWidth
        title={<h3>{changePasswordTitle}</h3>}
        description={
          <p>
            <FormattedMessage
              id="xpack.security.account.changePasswordNotSupportedText"
              defaultMessage="You cannot change the password for this account."
            />
          </p>
        }
      >
        <div />
      </EuiDescribedFormGroup>
    );
  }
}
