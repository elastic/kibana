/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  // @ts-ignore
  EuiButtonEmpty,
  EuiCard,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { ChangeEvent, Component, Fragment } from 'react';
import { canUserChangePassword, User } from '../../../../../common/model/user';

interface Props {
  user: User;
}

interface State {
  showForm: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export class ChangePassword extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showForm: false,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
  }

  public render() {
    const changePasswordTitle = (
      <FormattedMessage
        id="xpack.security.account.changePasswordTitle"
        defaultMessage="Change password"
      />
    );
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
        <EuiFormRow hasEmptyLabelSpace={true}>
          {this.state.showForm ? (
            this.getForm()
          ) : (
            <EuiButtonEmpty onClick={() => this.setState({ showForm: true })}>
              {changePasswordTitle}
            </EuiButtonEmpty>
          )}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  private getLink = () => {
    const cardTitle = (
      <h2>
        <FormattedMessage
          id="xpack.security.account.changePasswordCardTitle"
          defaultMessage="Change password"
        />
      </h2>
    );
    if (!canUserChangePassword(this.props.user)) {
      return (
        <EuiCard
          layout="horizontal"
          title={cardTitle}
          description={
            <FormattedMessage
              id="xpack.security.account.changePasswordDescription"
              defaultMessage="this is where you change your password"
            />
          }
          icon={<EuiIcon type="securityApp" size="xl" />}
          onClick={() => this.setState({ showForm: true })}
        />
      );
    } else {
      return (
        <EuiCard
          layout="horizontal"
          title={cardTitle}
          description={
            <FormattedMessage
              id="xpack.seurity.account.noChangePasswordDescription"
              defaultMessage="You cannot change the password for this account"
            />
          }
          icon={<EuiIcon color="subdued" type="securityApp" size="xl" />}
        />
      );
    }
  };

  private getForm = () => {
    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.security.account.changePasswordForm.currentPasswordLabel"
              defaultMessage="Current password"
            />
          }
        >
          <EuiFieldText
            type="password"
            value={this.state.currentPassword}
            onChange={this.onCurrentPasswordChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.security.account.changePasswordForm.newPasswordLabel"
              defaultMessage="New password"
            />
          }
        >
          <EuiFieldText
            type="password"
            value={this.state.newPassword}
            onChange={this.onNewPasswordChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.security.account.changePasswordForm.confirmPasswordLabel"
              defaultMessage="Confirm password"
            />
          }
        >
          <EuiFieldText
            type="password"
            value={this.state.confirmPassword}
            onChange={this.onConfirmPasswordChange}
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiButton
                onClick={() => {
                  this.setState({ showForm: false });
                }}
              >
                <FormattedMessage
                  id="xpack.security.account.changePasswordForm.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton onClick={this.onChangePasswordClick} fill>
                <FormattedMessage
                  id="xpack.security.account.changePasswordForm.saveChangesButtonLabel"
                  defaultMessage="Save changes"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </Fragment>
    );
  };

  private onCurrentPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ currentPassword: e.target.value });
  };

  private onNewPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ newPassword: e.target.value });
  };

  private onConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ confirmPassword: e.target.value });
  };

  private onChangePasswordClick = () => {
    return;
  };
}
