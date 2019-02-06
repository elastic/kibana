/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiAccordion,
  EuiButton,
  // @ts-ignore
  EuiCard,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { ChangeEvent, Component, Fragment } from 'react';

interface Props {
  user: any;
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
    if (this.state.showForm) {
      return this.getForm();
    }
    return this.getLink();
  }

  private getLink = () => {
    return (
      <EuiCard
        layout="horizontal"
        title={<h3>Change password</h3>}
        description={<p>this is where you change your password</p>}
        icon={<EuiIcon type="securityApp" size="xl" />}
        onClick={() => this.setState({ showForm: true })}
      />
    );
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
          <Fragment>
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
            <EuiButton onClick={this.onChangePasswordClick}>
              <FormattedMessage
                id="xpack.security.account.changePasswordForm.saveChangesButtonLabel"
                defaultMessage="Save changes"
              />
            </EuiButton>
          </Fragment>
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
