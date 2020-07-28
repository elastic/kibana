/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './login_form.scss';

import React, { ChangeEvent, Component, FormEvent, Fragment, MouseEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  EuiButton,
  EuiIcon,
  EuiCallOut,
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiLoadingSpinner,
  EuiLink,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { HttpStart, IHttpFetchError, NotificationsStart } from 'src/core/public';
import { parseNext } from '../../../../../common/parse_next';
import { LoginSelector } from '../../../../../common/login_state';
import { LoginValidator } from './validate_login';

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

export enum PageMode {
  Selector,
  Form,
  LoginHelp,
}

export class LoginForm extends Component<Props, State> {
  private readonly validator: LoginValidator;

  constructor(props: Props) {
    super(props);
    this.validator = new LoginValidator({ shouldValidate: false });

    const mode = this.showLoginSelector() ? PageMode.Selector : PageMode.Form;

    this.state = {
      loadingState: { type: LoadingStateType.None },
      username: '',
      password: '',
      message: this.props.infoMessage
        ? { type: MessageType.Info, content: this.props.infoMessage }
        : { type: MessageType.None },
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
      <div className="secLoginAssistanceMessage">
        <EuiHorizontalRule size="half" />
        <EuiText size="xs">
          <ReactMarkdown>{this.props.loginAssistanceMessage}</ReactMarkdown>
        </EuiText>
      </div>
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
    const loginSelectorLink = this.showLoginSelector() ? (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="loginBackToSelector"
          size="xs"
          onClick={() => this.onPageModeChange(PageMode.Selector)}
        >
          <FormattedMessage
            id="xpack.security.loginPage.loginSelectorLinkText"
            defaultMessage="See more login options"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    ) : null;

    return (
      <EuiPanel data-test-subj="loginForm">
        <form onSubmit={this.submitLoginForm}>
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

          <EuiSpacer />

          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
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
            </EuiFlexItem>
            {loginSelectorLink}
          </EuiFlexGroup>
        </form>
      </EuiPanel>
    );
  };

  private renderSelector = () => {
    return (
      <EuiPanel data-test-subj="loginSelector" paddingSize="none">
        {this.props.selector.providers.map((provider) => (
          <button
            key={provider.name}
            data-test-subj={`loginCard-${provider.type}/${provider.name}`}
            disabled={!this.isLoadingState(LoadingStateType.None)}
            onClick={() =>
              provider.usesLoginForm
                ? this.onPageModeChange(PageMode.Form)
                : this.loginWithSelector(provider.type, provider.name)
            }
            className={`secLoginCard ${
              this.isLoadingState(LoadingStateType.Selector, provider.name)
                ? 'secLoginCard-isLoading'
                : ''
            }`}
          >
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon size="xl" type={provider.icon ? provider.icon : 'empty'} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs" className="secLoginCard__title">
                  <p>
                    {provider.description ?? (
                      <FormattedMessage
                        id="xpack.security.loginPage.loginProviderDescription"
                        defaultMessage="Log in with {providerType}/{providerName}"
                        values={{
                          providerType: provider.type,
                          providerName: provider.name,
                        }}
                      />
                    )}
                  </p>
                </EuiTitle>
                {provider.hint ? <p className="secLoginCard__hint">{provider.hint}</p> : null}
              </EuiFlexItem>
              {this.isLoadingState(LoadingStateType.Selector, provider.name) ? (
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </button>
        ))}
      </EuiPanel>
    );
  };

  private renderLoginHelp = () => {
    return (
      <EuiPanel data-test-subj="loginHelp">
        <EuiText>
          <ReactMarkdown>{this.props.loginHelp || ''}</ReactMarkdown>
        </EuiText>
      </EuiPanel>
    );
  };

  private renderPageModeSwitchLink = () => {
    if (this.state.mode === PageMode.LoginHelp) {
      return (
        <Fragment>
          <EuiSpacer />
          <EuiText size="xs" className="eui-textCenter">
            <EuiLink
              data-test-subj="loginBackToLoginLink"
              onClick={() => this.onPageModeChange(this.state.previousMode)}
            >
              <FormattedMessage
                id="xpack.security.loginPage.goBackToLoginLink"
                defaultMessage="Take me back to Login"
              />
            </EuiLink>
          </EuiText>
        </Fragment>
      );
    }

    if (this.props.loginHelp) {
      return (
        <Fragment>
          <EuiSpacer />
          <EuiText size="xs" className="eui-textCenter">
            <EuiLink
              data-test-subj="loginHelpLink"
              onClick={() => this.onPageModeChange(PageMode.LoginHelp)}
            >
              <FormattedMessage
                id="xpack.security.loginPage.loginHelpLinkText"
                defaultMessage="Need help?"
              />
            </EuiLink>
          </EuiText>
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

  private onPageModeChange = (mode: PageMode) => {
    this.setState({ message: { type: MessageType.None }, mode, previousMode: this.state.mode });
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

    this.validator.enableValidation();

    const { username, password } = this.state;
    if (this.validator.validateForLogin(username, password).isInvalid) {
      // Since validation is enabled now, we should ask React to re-render form and display
      // validation error messages if any.
      return this.forceUpdate();
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

  private showLoginSelector() {
    return (
      this.props.selector.enabled &&
      this.props.selector.providers.some((provider) => !provider.usesLoginForm)
    );
  }
}
