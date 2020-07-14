/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
} from '@elastic/eui';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { ChangeEvent, Component } from 'react';
import { NotificationsStart } from 'src/core/public';
import { User } from '../../../../../common/model';
import { UserAPIClient } from '../..';

interface Props {
  user: User;
  isUserChangingOwnPassword: boolean;
  onChangePassword?: () => void;
  userAPIClient: PublicMethodsOf<UserAPIClient>;
  notifications: NotificationsStart;
}

interface State {
  shouldValidate: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  currentPasswordError: boolean;
  changeInProgress: boolean;
}

function getInitialState(): State {
  return {
    shouldValidate: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    currentPasswordError: false,
    changeInProgress: false,
  };
}

export class ChangePasswordForm extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = getInitialState();
  }

  public render() {
    return this.getForm();
  }

  private getForm = () => {
    return (
      <EuiForm>
        {this.props.isUserChangingOwnPassword && (
          <EuiFormRow
            {...this.validateCurrentPassword()}
            fullWidth
            label={
              <FormattedMessage
                id="xpack.security.account.changePasswordForm.currentPasswordLabel"
                defaultMessage="Current password"
              />
            }
          >
            <EuiFieldText
              autoComplete="off"
              data-test-subj="currentPassword"
              type="password"
              value={this.state.currentPassword}
              onChange={this.onCurrentPasswordChange}
              disabled={this.state.changeInProgress}
              fullWidth
            />
          </EuiFormRow>
        )}

        <EuiFormRow
          helpText={
            <FormattedMessage
              id="xpack.security.account.changePasswordForm.passwordRequirements"
              defaultMessage="Use at least 6 characters."
            />
          }
          {...this.validateNewPassword()}
          fullWidth
          label={
            <FormattedMessage
              id="xpack.security.account.changePasswordForm.newPasswordLabel"
              defaultMessage="New password"
            />
          }
        >
          <EuiFieldText
            autoComplete="new-password"
            data-test-subj="newPassword"
            type="password"
            value={this.state.newPassword}
            onChange={this.onNewPasswordChange}
            disabled={this.state.changeInProgress}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow
          {...this.validateConfirmPassword()}
          fullWidth
          label={
            <FormattedMessage
              id="xpack.security.account.changePasswordForm.confirmPasswordLabel"
              defaultMessage="Confirm new password"
            />
          }
        >
          <EuiFieldText
            autoComplete="new-password"
            data-test-subj="confirmNewPassword"
            type="password"
            value={this.state.confirmPassword}
            onChange={this.onConfirmPasswordChange}
            disabled={this.state.changeInProgress}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiFlexGroup alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={this.onChangePasswordClick}
                fill
                isLoading={this.state.changeInProgress}
                data-test-subj="changePasswordButton"
              >
                <FormattedMessage
                  id="xpack.security.account.changePasswordForm.saveChangesButtonLabel"
                  defaultMessage="Change password"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={this.onCancelClick} isDisabled={this.state.changeInProgress}>
                <FormattedMessage
                  id="xpack.security.account.changePasswordForm.cancelButtonLabel"
                  defaultMessage="Reset"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiForm>
    );
  };

  private onCurrentPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ currentPassword: e.target.value, currentPasswordError: false });
  };

  private onNewPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ newPassword: e.target.value });
  };

  private onConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ confirmPassword: e.target.value });
  };

  private onCancelClick = () => {
    this.setState(getInitialState());
  };

  private onChangePasswordClick = async () => {
    this.setState({ shouldValidate: true, currentPasswordError: false }, () => {
      const { isInvalid } = this.validateForm();
      if (isInvalid) {
        return;
      }

      this.setState({ changeInProgress: true }, () => this.performPasswordChange());
    });
  };

  private validateCurrentPassword = (shouldValidate = this.state.shouldValidate) => {
    if (!shouldValidate || !this.props.isUserChangingOwnPassword) {
      return {
        isInvalid: false,
      };
    }

    if (this.state.currentPasswordError) {
      return {
        isInvalid: true,
        error: (
          <FormattedMessage
            id="xpack.security.account.changePasswordForm.invalidPassword"
            defaultMessage="Current password is incorrect."
          />
        ),
      };
    }

    if (!this.state.currentPassword) {
      return {
        isInvalid: true,
        error: (
          <FormattedMessage
            id="xpack.security.account.currentPasswordRequired"
            defaultMessage="Current password is required."
          />
        ),
      };
    }

    return {
      isInvalid: false,
    };
  };

  private validateNewPassword = (shouldValidate = this.state.shouldValidate) => {
    const { newPassword } = this.state;
    const minPasswordLength = 6;
    if (shouldValidate && newPassword.length < minPasswordLength) {
      return {
        isInvalid: true,
        error: (
          <FormattedMessage
            id="xpack.security.account.passwordLengthDescription"
            defaultMessage="Password is too short."
          />
        ),
      };
    }

    return {
      isInvalid: false,
    };
  };

  private validateConfirmPassword = (shouldValidate = this.state.shouldValidate) => {
    const { newPassword, confirmPassword } = this.state;
    if (shouldValidate && newPassword !== confirmPassword) {
      return {
        isInvalid: true,
        error: (
          <FormattedMessage
            id="xpack.security.account.passwordsDoNotMatch"
            defaultMessage="Passwords do not match."
          />
        ),
      };
    }

    return {
      isInvalid: false,
    };
  };

  private validateForm = () => {
    const validation = [
      this.validateCurrentPassword(true),
      this.validateNewPassword(true),
      this.validateConfirmPassword(true),
    ];

    const firstFailure = validation.find((result) => result.isInvalid);
    if (firstFailure) {
      return firstFailure;
    }

    return {
      isInvalid: false,
    };
  };

  private performPasswordChange = async () => {
    try {
      await this.props.userAPIClient.changePassword(
        this.props.user.username,
        this.state.newPassword,
        this.state.currentPassword
      );
      this.handleChangePasswordSuccess();
    } catch (e) {
      this.handleChangePasswordFailure(e);
    } finally {
      this.setState({
        changeInProgress: false,
      });
    }
  };

  private handleChangePasswordSuccess = () => {
    this.props.notifications.toasts.addSuccess({
      title: i18n.translate('xpack.security.account.changePasswordSuccess', {
        defaultMessage: 'Your password has been changed.',
      }),
      'data-test-subj': 'passwordUpdateSuccess',
    });

    this.setState({
      currentPasswordError: false,
      shouldValidate: false,
      newPassword: '',
      currentPassword: '',
      confirmPassword: '',
    });
    if (this.props.onChangePassword) {
      this.props.onChangePassword();
    }
  };

  private handleChangePasswordFailure = (error: Record<string, any>) => {
    if (error.body && error.body.statusCode === 403) {
      this.setState({ currentPasswordError: true });
    } else {
      this.props.notifications.toasts.addDanger(
        i18n.translate('xpack.security.management.users.editUser.settingPasswordErrorMessage', {
          defaultMessage: 'Error setting password: {message}',
          values: { message: _.get(error, 'body.message') },
        })
      );
    }
  };
}
