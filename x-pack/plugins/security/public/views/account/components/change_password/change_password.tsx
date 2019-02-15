/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  // @ts-ignore
  EuiButtonEmpty,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ChangePasswordForm } from 'plugins/security/components/management/change_password_form';
import React, { ChangeEvent, Component } from 'react';
import { toastNotifications } from 'ui/notify';
import { canUserChangePassword, User } from '../../../../../common/model/user';
import { UserAPIClient } from '../../../../lib/api';

interface Props {
  user: User;
}

export class ChangePassword extends Component<Props, {}> {
  constructor(props: Props) {
    super(props);
  }

  public render() {
    const canChangePassword = canUserChangePassword(this.props.user);

    const changePasswordTitle = (
      <FormattedMessage
        id="xpack.security.account.changePasswordTitle"
        defaultMessage="Change password"
      />
    );

    if (canChangePassword) {
      return this.getChangePasswordForm(changePasswordTitle);
    }
    return this.getChangePasswordUnavailable(changePasswordTitle);
  }

  private getChangePasswordForm = (changePasswordTitle: React.ReactElement<any>) => {
    return (
      <EuiDescribedFormGroup
        title={<h3>{changePasswordTitle}</h3>}
        description={
          <p>
            <FormattedMessage
              id="xpack.security.account.changePasswordDescription"
              defaultMessage="Change the password used to sign in to your account."
            />
          </p>
        }
      >
        <ChangePasswordForm user={this.props.user} isUserChangingOwnPassword={true} />
      </EuiDescribedFormGroup>
    );
  };

  private getChangePasswordUnavailable(changePasswordTitle: React.ReactElement<any>) {
    return (
      <EuiDescribedFormGroup
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
