/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './login_page.scss';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import classNames from 'classnames';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import type { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type {
  AppMountParameters,
  CoreStart,
  CustomBrandingStart,
  FatalErrorsStart,
  HttpStart,
  NotificationsStart,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import {
  AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER,
  LOGOUT_REASON_QUERY_STRING_PARAMETER,
} from '../../../common/constants';
import type { LoginState } from '../../../common/login_state';
import type { LogoutReason } from '../../../common/types';
import type { ConfigType } from '../../config';
import type { LoginFormProps } from './components';
import { DisabledLoginForm, LoginForm, LoginFormMessageType } from './components';

interface Props {
  http: HttpStart;
  notifications: NotificationsStart;
  fatalErrors: FatalErrorsStart;
  loginAssistanceMessage: string;
  sameSiteCookies?: ConfigType['sameSiteCookies'];
  customBranding: CustomBrandingStart;
}

interface State {
  loginState: LoginState | null;
  customBranding: CustomBranding;
}

const loginFormMessages: Record<LogoutReason, NonNullable<LoginFormProps['message']>> = {
  SESSION_EXPIRED: {
    type: LoginFormMessageType.Info,
    content: i18n.translate('xpack.security.login.sessionExpiredDescription', {
      defaultMessage: 'Your session has timed out. Please log in again.',
    }),
  },
  AUTHENTICATION_ERROR: {
    type: LoginFormMessageType.Info,
    content: i18n.translate('xpack.security.login.authenticationErrorDescription', {
      defaultMessage: 'An unexpected authentication error occurred. Please log in again.',
    }),
  },
  LOGGED_OUT: {
    type: LoginFormMessageType.Info,
    content: i18n.translate('xpack.security.login.loggedOutDescriptionDefault', {
      defaultMessage: 'You have logged out of Elastic.',
    }),
  },
  UNAUTHENTICATED: {
    type: LoginFormMessageType.Danger,
    content: i18n.translate('xpack.security.unauthenticated.errorDescription', {
      defaultMessage:
        'Try logging in again, and if the problem persists, contact your system administrator.',
    }),
  },
};

export class LoginPage extends Component<Props, State> {
  state = { loginState: null, customBranding: {} } as State;
  private subscription?: Subscription;

  public async componentDidMount() {
    const loadingCount$ = new BehaviorSubject(1);
    this.subscription = this.props.customBranding.customBranding$.subscribe((next) => {
      this.setState({ ...this.state, customBranding: next });
    });
    this.props.http.addLoadingCountSource(loadingCount$.asObservable());

    try {
      this.setState({
        loginState: await this.props.http.get('/internal/security/login_state'),
      });
    } catch (err) {
      this.props.fatalErrors.add(err as Error);
    }

    loadingCount$.next(0);
    loadingCount$.complete();
  }

  public componentWillUnmount() {
    this.subscription?.unsubscribe();
  }

  public render() {
    const loginState = this.state.loginState;
    if (!loginState) {
      return null;
    }

    const isSecureConnection = !!window.location.protocol.match(/^https/);
    const isCookiesEnabled = window.navigator.cookieEnabled;
    const { allowLogin, layout, requiresSecureConnection } = loginState;

    const loginIsSupported =
      (requiresSecureConnection && !isSecureConnection) || !isCookiesEnabled
        ? false
        : allowLogin && layout === 'form';

    const contentHeaderClasses = classNames('loginWelcome__content', 'eui-textCenter', {
      ['loginWelcome__contentDisabledForm']: !loginIsSupported,
    });

    const contentBodyClasses = classNames('loginWelcome__content', 'loginWelcome-body', {
      ['loginWelcome__contentDisabledForm']: !loginIsSupported,
    });

    const customLogo = this.state.customBranding?.logo;
    const logo = customLogo ? (
      <img src={customLogo} width="40" height="40" alt="logo" />
    ) : (
      <EuiIcon type="logoElastic" size="xxl" />
    );
    const pageTitle = this.state.customBranding?.pageTitle || 'Elastic';
    return (
      <div className="loginWelcome login-form">
        <header className="loginWelcome__header">
          <div className={contentHeaderClasses}>
            <EuiSpacer size="xxl" />
            <span className="loginWelcome__logo">{logo}</span>
            <EuiTitle size="m" className="loginWelcome__title" data-test-subj="loginWelcomeTitle">
              <h1>
                <FormattedMessage
                  id="xpack.security.loginPage.welcomeTitle"
                  defaultMessage="Welcome to {pageTitle}"
                  values={{ pageTitle }}
                />
              </h1>
            </EuiTitle>
            <EuiSpacer size="xl" />
          </div>
        </header>
        <div className={contentBodyClasses}>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              {this.getLoginForm({
                ...loginState,
                isSecureConnection,
                isCookiesEnabled,
                pageTitle,
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }

  private getLoginForm = ({
    layout,
    requiresSecureConnection,
    isSecureConnection,
    isCookiesEnabled,
    selector,
    loginHelp,
    pageTitle,
  }: LoginState & {
    isSecureConnection: boolean;
    isCookiesEnabled: boolean;
    pageTitle: string;
  }) => {
    const isLoginExplicitlyDisabled = selector.providers.length === 0;
    if (isLoginExplicitlyDisabled) {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.noLoginMethodsAvailableTitle"
              defaultMessage="Login is disabled."
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.noLoginMethodsAvailableMessage"
              defaultMessage="Contact your system administrator."
            />
          }
        />
      );
    }

    if (requiresSecureConnection && !isSecureConnection) {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.requiresSecureConnectionTitle"
              defaultMessage="A secure connection is required for log in"
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.requiresSecureConnectionMessage"
              defaultMessage="Contact your system administrator."
            />
          }
        />
      );
    }

    if (!isCookiesEnabled) {
      if (isWindowEmbedded()) {
        return (
          <div style={{ maxWidth: '36em', margin: 'auto', textAlign: 'center' }}>
            <EuiText color="subdued">
              <p>
                {this.props.sameSiteCookies !== 'None' ? (
                  <FormattedMessage
                    id="xpack.security.loginPage.openInNewWindowOrChangeKibanaConfigTitle"
                    defaultMessage="To view this content, open it in a new window or ask your administrator to allow cross-origin cookies."
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.security.loginPage.openInNewWindowOrChangeBrowserSettingsTitle"
                    defaultMessage="To view this content, open it in a new window or adjust your browser settings to allow third-party cookies."
                  />
                )}
              </p>
            </EuiText>
            <EuiSpacer />
            <EuiButton
              href={window.location.href}
              target="_blank"
              iconType="popout"
              iconSide="right"
              fill
            >
              <FormattedMessage
                id="xpack.security.loginPage.openInNewWindowButton"
                defaultMessage="Open in new window"
              />
            </EuiButton>
          </div>
        );
      }

      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.requiresCookiesTitle"
              defaultMessage="Cookies are required to log in to {pageTitle}"
              values={{ pageTitle }}
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.requiresCookiesMessage"
              defaultMessage="Enable cookies in your browser settings to continue."
            />
          }
        />
      );
    }

    if (layout === 'error-es-unavailable') {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.esUnavailableTitle"
              defaultMessage="Cannot connect to the Elasticsearch cluster"
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.esUnavailableMessage"
              defaultMessage="See the Kibana logs for details and try reloading the page."
            />
          }
        />
      );
    }

    if (layout === 'error-xpack-unavailable') {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.xpackUnavailableTitle"
              defaultMessage="Cannot connect to the Elasticsearch cluster currently configured for Kibana."
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.xpackUnavailableMessage"
              defaultMessage="To use the full set of free features in this distribution of Kibana, please update Elasticsearch to the default distribution."
            />
          }
        />
      );
    }

    if (layout !== 'form') {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.unknownLayoutTitle"
              defaultMessage="Unsupported login form layout."
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.unknownLayoutMessage"
              defaultMessage="See the Kibana logs for details and try reloading the page."
            />
          }
        />
      );
    }

    const { searchParams } = new URL(window.location.href);
    const loggedOutMessage = i18n.translate('xpack.security.login.loggedOutDescription', {
      defaultMessage: 'You have logged out of {pageTitle}.',
      values: { pageTitle },
    });
    loginFormMessages['LOGGED_OUT' as LogoutReason] = {
      type: LoginFormMessageType.Info,
      content: loggedOutMessage,
    };
    return (
      <LoginForm
        http={this.props.http}
        notifications={this.props.notifications}
        selector={selector}
        message={
          loginFormMessages[searchParams.get(LOGOUT_REASON_QUERY_STRING_PARAMETER) as LogoutReason]
        }
        loginAssistanceMessage={this.props.loginAssistanceMessage}
        loginHelp={loginHelp}
        authProviderHint={searchParams.get(AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER) || undefined}
      />
    );
  };
}

export function renderLoginPage(
  i18nStart: CoreStart['i18n'],
  { element, theme$ }: Pick<AppMountParameters, 'element' | 'theme$'>,
  props: Props
) {
  ReactDOM.render(
    <i18nStart.Context>
      <KibanaThemeProvider theme$={theme$}>
        <LoginPage {...props} />
      </KibanaThemeProvider>
    </i18nStart.Context>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}

function isWindowEmbedded() {
  try {
    return window.self !== window.top;
  } catch (error) {
    return true;
  }
}
