/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, Component, FormEvent, Fragment, MouseEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { HttpStart, IHttpFetchError, NotificationsStart } from 'src/core/public';
import { parseNext } from '../../../../../common/parse_next';
import { LoginSelector } from '../../../../../common/login_state';

interface Props {
  http: HttpStart;
  notifications: NotificationsStart;
  selector: LoginSelector;
  showLoginForm: boolean;
  infoMessage?: string;
  loginAssistanceMessage: string;
}

interface State {
  loadingState:
    | { type: LoadingStateType.None }
    | { type: LoadingStateType.Form }
    | { type: LoadingStateType.Selector; providerName: string };
  username: string;
  password: string;
  message:
    | { type: MessageType.None }
    | { type: MessageType.Danger | MessageType.Info; content: string };
}

enum LoadingStateType {
  None,
  Form,
  Selector,
}

enum MessageType {
  None,
  Info,
  Danger,
}

export class LoginForm extends Component<Props, State> {
  public state: State = {
    loadingState: { type: LoadingStateType.None },
    username: '',
    password: '',
    message: this.props.infoMessage
      ? { type: MessageType.Info, content: this.props.infoMessage }
      : { type: MessageType.None },
  };

  public render() {
    return (
      <Fragment>
        {this.renderLoginAssistanceMessage()}
        {this.renderMessage()}
        {this.renderSelector()}
        {this.renderLoginForm()}
      </Fragment>
    );
  }

  private renderLoginForm = () => {
    if (!this.props.showLoginForm) {
      return null;
    }

    return (
      <EuiPanel>
        <form onSubmit={this.submitLoginForm}>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.security.login.basicLoginForm.usernameFormRowLabel"
                defaultMessage="Username"
              />
            }
          >
            <EuiFieldText
              id="username"
              name="username"
              data-test-subj="loginUsername"
              value={this.state.username}
              onChange={this.onUsernameChange}
              disabled={!this.isLoadingState(LoadingStateType.None)}
              isInvalid={false}
              aria-required={true}
              inputRef={this.setUsernameInputRef}
            />
          </EuiFormRow>

          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.security.login.basicLoginForm.passwordFormRowLabel"
                defaultMessage="Password"
              />
            }
          >
            <EuiFieldText
              autoComplete="off"
              id="password"
              name="password"
              data-test-subj="loginPassword"
              type="password"
              value={this.state.password}
              onChange={this.onPasswordChange}
              disabled={!this.isLoadingState(LoadingStateType.None)}
              isInvalid={false}
              aria-required={true}
            />
          </EuiFormRow>

          <EuiButton
            fill
            type="submit"
            color="primary"
            onClick={this.submitLoginForm}
            isDisabled={!this.isLoadingState(LoadingStateType.None)}
            isLoading={this.isLoadingState(LoadingStateType.Form)}
            data-test-subj="loginSubmit"
          >
            <FormattedMessage
              id="xpack.security.login.basicLoginForm.logInButtonLabel"
              defaultMessage="Log in"
            />
          </EuiButton>
        </form>
      </EuiPanel>
    );
  };

  private renderLoginAssistanceMessage = () => {
    if (!this.props.loginAssistanceMessage) {
      return null;
    }

    return (
      <Fragment>
        <EuiText size="s">
          <ReactMarkdown>{this.props.loginAssistanceMessage}</ReactMarkdown>
        </EuiText>
      </Fragment>
    );
  };

  private renderMessage = () => {
    const { message } = this.state;
    if (message.type === MessageType.Danger) {
      return (
        <Fragment>
          <EuiCallOut
            size="s"
            color="danger"
            data-test-subj="loginErrorMessage"
            title={message.content}
            role="alert"
          />
          <EuiSpacer size="l" />
        </Fragment>
      );
    }

    if (message.type === MessageType.Info) {
      return (
        <Fragment>
          <EuiCallOut
            size="s"
            color="primary"
            data-test-subj="loginInfoMessage"
            title={message.content}
            role="status"
          />
          <EuiSpacer size="l" />
        </Fragment>
      );
    }

    return null;
  };

  private renderSelector = () => {
    const showLoginSelector =
      this.props.selector.enabled && this.props.selector.providers.length > 0;
    if (!showLoginSelector) {
      return null;
    }

    const loginSelectorAndLoginFormSeparator = showLoginSelector && this.props.showLoginForm && (
      <>
        <EuiText textAlign="center" color="subdued">
          ―――&nbsp;&nbsp;
          <FormattedMessage id="xpack.security.loginPage.loginSelectorOR" defaultMessage="OR" />
          &nbsp;&nbsp;―――
        </EuiText>
        <EuiSpacer size="m" />
      </>
    );

    return (
      <>
        {this.props.selector.providers.map((provider, index) => (
          <Fragment key={index}>
            <EuiButton
              key={provider.name}
              fullWidth={true}
              isDisabled={!this.isLoadingState(LoadingStateType.None)}
              isLoading={this.isLoadingState(LoadingStateType.Selector, provider.name)}
              onClick={() => this.loginWithSelector(provider.type, provider.name)}
            >
              {provider.description ?? (
                <FormattedMessage
                  id="xpack.security.loginPage.loginProviderDescription"
                  defaultMessage="Login with {providerType}/{providerName}"
                  values={{
                    providerType: provider.type,
                    providerName: provider.name,
                  }}
                />
              )}
            </EuiButton>
            <EuiSpacer size="m" />
          </Fragment>
        ))}
        {loginSelectorAndLoginFormSeparator}
      </>
    );
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

  private submitLoginForm = async (
    e: MouseEvent<HTMLButtonElement> | FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!this.isFormValid()) {
      return;
    }

    this.setState({
      loadingState: { type: LoadingStateType.Form },
      message: { type: MessageType.None },
    });

    const { http } = this.props;
    const { username, password } = this.state;

    try {
      await http.post('/internal/security/login', { body: JSON.stringify({ username, password }) });
      window.location.href = parseNext(window.location.href, http.basePath.serverBasePath);
    } catch (error) {
      const message =
        (error as IHttpFetchError).response?.status === 401
          ? i18n.translate(
              'xpack.security.login.basicLoginForm.invalidUsernameOrPasswordErrorMessage',
              { defaultMessage: 'Invalid username or password. Please try again.' }
            )
          : i18n.translate('xpack.security.login.basicLoginForm.unknownErrorMessage', {
              defaultMessage: 'Oops! Error. Try again.',
            });

      this.setState({
        message: { type: MessageType.Danger, content: message },
        loadingState: { type: LoadingStateType.None },
      });
    }
  };

  private loginWithSelector = async (providerType: string, providerName: string) => {
    this.setState({
      loadingState: { type: LoadingStateType.Selector, providerName },
      message: { type: MessageType.None },
    });

    try {
      const { location } = await this.props.http.post<{ location: string }>(
        '/internal/security/login_with',
        { body: JSON.stringify({ providerType, providerName, currentURL: window.location.href }) }
      );

      window.location.href = location;
    } catch (err) {
      this.props.notifications.toasts.addError(err, {
        title: i18n.translate('xpack.security.loginPage.loginSelectorErrorMessage', {
          defaultMessage: 'Could not perform login.',
        }),
      });

      this.setState({ loadingState: { type: LoadingStateType.None } });
    }
  };

  private isLoadingState(type: LoadingStateType.None | LoadingStateType.Form): boolean;
  private isLoadingState(type: LoadingStateType.Selector, providerName: string): boolean;
  private isLoadingState(type: LoadingStateType, providerName?: string) {
    const { loadingState } = this.state;
    if (loadingState.type !== type) {
      return false;
    }

    return (
      loadingState.type !== LoadingStateType.Selector || loadingState.providerName === providerName
    );
  }
}
