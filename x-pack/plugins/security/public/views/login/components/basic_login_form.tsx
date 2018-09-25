/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiCallOut, EuiFieldText, EuiFormRow, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { ChangeEvent, Component, Fragment } from 'react';
import { LoginState } from '../../../../common/login_state';

interface Props {
  http: any;
  window: any;
  infoMessage?: string;
  loginState: LoginState;
  next: string;
}

interface State {
  hasError: boolean;
  isLoading: boolean;
  username: string;
  password: string;
  message: string;
}

export class BasicLoginForm extends Component<Props, State> {
  public state = {
    hasError: false,
    isLoading: false,
    username: '',
    password: '',
    message: '',
  };

  public componentDidMount() {
    document.addEventListener('keydown', this.submitOnEnter);
  }

  public componentWillUnmount() {
    document.removeEventListener('keydown', this.submitOnEnter);
  }

  public render() {
    return (
      <Fragment>
        {this.renderMessage()}
        <EuiPanel>
          <EuiFormRow label="Username">
            <EuiFieldText
              name="username"
              title="username"
              data-test-subj="loginUsername"
              value={this.state.username}
              onChange={this.onUsernameChange}
              disabled={this.state.isLoading}
              aria-required={true}
              inputRef={this.setUsernameInputRef}
            />
          </EuiFormRow>

          <EuiFormRow label="Password">
            <EuiFieldText
              name="password"
              title="password"
              data-test-subj="loginPassword"
              type="password"
              value={this.state.password}
              onChange={this.onPasswordChange}
              disabled={this.state.isLoading}
              aria-required={true}
            />
          </EuiFormRow>

          <EuiSpacer />
          <EuiButton
            fill
            color="primary"
            onClick={this.submit}
            isLoading={this.state.isLoading}
            isDisabled={!this.isFormValid()}
            data-test-subj="loginSubmit"
          >
            Log in
          </EuiButton>
        </EuiPanel>
      </Fragment>
    );
  }

  private renderMessage = () => {
    if (this.state.message) {
      return (
        <Fragment>
          <EuiCallOut
            size="s"
            color="danger"
            data-test-subj="loginErrorMessage"
            title={this.state.message}
          />
          <EuiSpacer size="l" />
        </Fragment>
      );
    }

    if (this.props.infoMessage) {
      return (
        <Fragment>
          <EuiCallOut
            size="s"
            color="primary"
            data-test-subj="loginInfoMessage"
            title={this.props.infoMessage}
          />
          <EuiSpacer size="l" />
        </Fragment>
      );
    }
    return null;
  };

  private setUsernameInputRef(ref: HTMLInputElement) {
    if (ref) {
      ref.focus();
    }
  }

  private isFormValid = () => {
    const { username, password } = this.state;

    return username && password;
  };

  private onUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      username: e.target.value,
    });
  };

  private onPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      password: e.target.value,
    });
  };

  private submitOnEnter = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      this.submit();
    }
  };

  private submit = () => {
    if (!this.isFormValid()) {
      return;
    }

    this.setState({
      isLoading: true,
      message: '',
    });

    const { http, window, next } = this.props;

    const { username, password } = this.state;

    http.post('./api/security/v1/login', { username, password }).then(
      () => (window.location.href = next),
      (error: any) => {
        const { statusCode = 500 } = error.data || {};

        let message = 'Oops! Error. Try again.';
        if (statusCode === 401) {
          message = 'Oops! Invalid username/password. Try again.';
        }

        this.setState({
          hasError: true,
          message,
          isLoading: false,
        });
      }
    );
  };
}
