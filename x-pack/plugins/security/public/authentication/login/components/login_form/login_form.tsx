/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, Component, FormEvent, Fragment, MouseEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  EuiButton,
  EuiIcon,
  EuiCallOut,
  EuiCard,
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { HttpStart, IHttpFetchError, NotificationsStart } from 'src/core/public';
import { LoginValidator, LoginValidationResult } from './validate_login';
import { parseNext } from '../../../../../common/parse_next';
import { LoginSelector, LoginSelectorProvider } from '../../../../../common/login_state';

interface Props {
  http: HttpStart;
  notifications: NotificationsStart;
  selector: LoginSelector;
  infoMessage?: string;
  loginAssistanceMessage: string;
  loginHelp?: string;
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
  formError: LoginValidationResult | null;
  mode: PageMode;
  previousMode: PageMode;
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

enum PageMode {
  Selector,
  Form,
  LoginHelp,
}

export class LoginForm extends Component<Props, State> {
  private readonly validator: LoginValidator;

  constructor(props: Props) {
    super(props);
    this.validator = new LoginValidator({ shouldValidate: false });

    const mode = props.selector.providers.some(provider => !provider.usesLoginForm)
      ? PageMode.Selector
      : PageMode.Form;

    this.state = {
      loadingState: { type: LoadingStateType.None },
      username: '',
      password: '',
      message: this.props.infoMessage
        ? { type: MessageType.Info, content: this.props.infoMessage }
        : { type: MessageType.None },
      formError: null,
      mode,
      previousMode: mode,
    };
  }

  public render() {
    return (
      <Fragment>
        {this.renderLoginAssistanceMessage()}
        {this.renderMessage()}
        {this.renderContent()}
        {this.renderPageModeSwitchLink()}
      </Fragment>
    );
  }

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

  public renderContent() {
    switch (this.state.mode) {
      case PageMode.Form:
        return this.renderLoginForm();
      case PageMode.Selector:
        return this.renderSelector();
      case PageMode.LoginHelp:
        return this.renderLoginHelp();
    }
  }

  private renderLoginForm = () => {
    const loginSelectorLink = this.props.selector.providers.some(
      provider => !provider.usesLoginForm
    ) ? (
      <EuiFormRow>
        <EuiText size="s" textAlign="left">
          ????????
          <EuiButtonEmpty onClick={() => this.switchMode(PageMode.Selector)}>
            <EuiText>
              <strong>
                <FormattedMessage
                  id="xpack.security.loginPage.loginSelectorLinkText"
                  defaultMessage="Other options."
                />
              </strong>
            </EuiText>
          </EuiButtonEmpty>
        </EuiText>
      </EuiFormRow>
    ) : null;
    return (
      <EuiPanel>
        <form onSubmit={this.submitLoginForm}>
          {loginSelectorLink}
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.security.login.basicLoginForm.usernameFormRowLabel"
                defaultMessage="Username"
              />
            }
            {...this.validator.validateUsername(this.state.username)}
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
            {...this.validator.validatePassword(this.state.password)}
          >
            <EuiFieldPassword
              autoComplete="off"
              id="password"
              name="password"
              data-test-subj="loginPassword"
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

  private renderSelector = () => {
    const showLoginSelector =
      this.props.selector.enabled && this.props.selector.providers.length > 0;
    if (!showLoginSelector || this.state.mode !== PageMode.Selector) {
      return null;
    }

    return (
      <>
        {this.props.selector.providers.map((provider, index) => (
          <EuiCard
            className="loginCard"
            key={provider.name}
            isDisabled={!this.isLoadingState(LoadingStateType.None)}
            layout="horizontal"
            icon={provider.icon ? <EuiIcon size="xl" type={provider.icon} /> : undefined}
            title={
              provider.description ?? (
                <FormattedMessage
                  id="xpack.security.loginPage.loginProviderDescription"
                  defaultMessage="Login with {providerType}/{providerName}"
                  values={{
                    providerType: provider.type,
                    providerName: provider.name,
                  }}
                />
              )
            }
            titleSize="xs"
            description={provider.hint || ''}
            onClick={() => this.loginWithSelector(provider)}
          />
        ))}
      </>
    );
  };

  private renderLoginHelp = () => {
    return (
      <EuiPanel>
        <EuiText>
          <ReactMarkdown>{this.props.loginHelp || ''}</ReactMarkdown>
        </EuiText>
      </EuiPanel>
    );
  };

  /*  private renderSelector = () => {
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
  };*/

  private renderPageModeSwitchLink = () => {
    if (this.state.mode === PageMode.LoginHelp) {
      return (
        <EuiButtonEmpty
          style={{ fontWeight: 'bold' }}
          onClick={() => this.switchMode(this.state.previousMode)}
        >
          <EuiText size="s">
            <strong>
              <FormattedMessage
                id="xpack.security.loginPage.goBackToLoginLink"
                defaultMessage="Take me back to Login"
              />
            </strong>
          </EuiText>
        </EuiButtonEmpty>
      );
    }

    if (this.props.loginHelp) {
      return (
        <EuiButtonEmpty onClick={() => this.switchMode(PageMode.LoginHelp)}>
          <EuiText size="s">
            <strong>
              <FormattedMessage
                id="xpack.security.loginPage.loginHelpLinkText"
                defaultMessage="Need help?"
              />
            </strong>
          </EuiText>
        </EuiButtonEmpty>
      );
    }

    return null;
  };

  private switchMode(mode: PageMode) {
    this.setState({ message: { type: MessageType.None }, mode, previousMode: this.state.mode });
  }

  private setUsernameInputRef(ref: HTMLInputElement) {
    if (ref) {
      ref.focus();
    }
  }

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

    this.validator.enableValidation();

    const { username, password } = this.state;
    const result = this.validator.validateForLogin(username, password);
    if (result.isInvalid) {
      this.setState({ formError: result });
      return;
    } else {
      this.setState({ formError: null });
    }

    this.setState({
      loadingState: { type: LoadingStateType.Form },
      message: { type: MessageType.None },
    });

    const { http } = this.props;

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

  private loginWithSelector = async (provider: LoginSelectorProvider) => {
    if (provider.usesLoginForm) {
      this.setState({
        loadingState: { type: LoadingStateType.None },
        message: { type: MessageType.None },
        mode: PageMode.Form,
      });
      return;
    }

    this.setState({
      loadingState: { type: LoadingStateType.Selector, providerName: provider.name },
      message: { type: MessageType.None },
    });

    try {
      const { location } = await this.props.http.post<{ location: string }>(
        '/internal/security/login_with',
        {
          body: JSON.stringify({
            providerType: provider.type,
            providerName: provider.name,
            currentURL: window.location.href,
          }),
        }
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
