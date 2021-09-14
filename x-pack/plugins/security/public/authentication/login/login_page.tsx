/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './login_page.scss';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiTitle } from '@elastic/eui';
import classNames from 'classnames';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { BehaviorSubject } from 'rxjs';
import { parse } from 'url';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { CoreStart, FatalErrorsStart, HttpStart, NotificationsStart } from 'src/core/public';

import {
  AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER,
  LOGOUT_REASON_QUERY_STRING_PARAMETER,
} from '../../../common/constants';
import type { LoginState } from '../../../common/login_state';
import { DisabledLoginForm, LoginForm, LoginFormMessageType } from './components';

interface Props {
  http: HttpStart;
  notifications: NotificationsStart;
  fatalErrors: FatalErrorsStart;
  loginAssistanceMessage: string;
}

interface State {
  loginState: LoginState | null;
}

const messageMap = new Map([
  [
    'SESSION_EXPIRED',
    {
      type: LoginFormMessageType.Info,
      content: i18n.translate('xpack.security.login.sessionExpiredDescription', {
        defaultMessage: 'Your session has timed out. Please log in again.',
      }),
    },
  ],
  [
    'LOGGED_OUT',
    {
      type: LoginFormMessageType.Info,
      content: i18n.translate('xpack.security.login.loggedOutDescription', {
        defaultMessage: 'You have logged out of Elastic.',
      }),
    },
  ],
  [
    'UNAUTHENTICATED',
    {
      type: LoginFormMessageType.Danger,
      content: i18n.translate('xpack.security.unauthenticated.errorDescription', {
        defaultMessage:
          "We hit an authentication error. Please check your credentials and try again. If you still can't log in, contact your system administrator.",
      }),
    },
  ],
]);

export class LoginPage extends Component<Props, State> {
  state = { loginState: null } as State;

  public async componentDidMount() {
    const loadingCount$ = new BehaviorSubject(1);
    this.props.http.addLoadingCountSource(loadingCount$.asObservable());

    try {
      this.setState({ loginState: await this.props.http.get('/internal/security/login_state') });
    } catch (err) {
      this.props.fatalErrors.add(err);
    }

    loadingCount$.next(0);
    loadingCount$.complete();
  }

  public render() {
    const loginState = this.state.loginState;
    if (!loginState) {
      return null;
    }

    const isSecureConnection = !!window.location.protocol.match(/^https/);
    const { allowLogin, layout, requiresSecureConnection } = loginState;

    const loginIsSupported =
      requiresSecureConnection && !isSecureConnection ? false : allowLogin && layout === 'form';

    const contentHeaderClasses = classNames('loginWelcome__content', 'eui-textCenter', {
      ['loginWelcome__contentDisabledForm']: !loginIsSupported,
    });

    const contentBodyClasses = classNames('loginWelcome__content', 'loginWelcome-body', {
      ['loginWelcome__contentDisabledForm']: !loginIsSupported,
    });

    return (
      <div className="loginWelcome login-form">
        <header className="loginWelcome__header">
          <div className={contentHeaderClasses}>
            <EuiSpacer size="xxl" />
            <span className="loginWelcome__logo">
              <EuiIcon type="logoElastic" size="xxl" />
            </span>
            <EuiTitle size="m" className="loginWelcome__title">
              <h1>
                <FormattedMessage
                  id="xpack.security.loginPage.welcomeTitle"
                  defaultMessage="Welcome to Elastic"
                />
              </h1>
            </EuiTitle>
            <EuiSpacer size="xl" />
          </div>
        </header>
        <div className={contentBodyClasses}>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>{this.getLoginForm({ ...loginState, isSecureConnection })}</EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }

  private getLoginForm = ({
    layout,
    requiresSecureConnection,
    isSecureConnection,
    selector,
    loginHelp,
  }: LoginState & { isSecureConnection: boolean }) => {
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

    const query = parse(window.location.href, true).query;
    return (
      <LoginForm
        http={this.props.http}
        notifications={this.props.notifications}
        selector={selector}
        // @ts-expect-error Map.get is ok with getting `undefined`
        message={messageMap.get(query[LOGOUT_REASON_QUERY_STRING_PARAMETER]?.toString())}
        loginAssistanceMessage={this.props.loginAssistanceMessage}
        loginHelp={loginHelp}
        authProviderHint={query[AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER]?.toString()}
      />
    );
  };
}

export function renderLoginPage(i18nStart: CoreStart['i18n'], element: Element, props: Props) {
  ReactDOM.render(
    <i18nStart.Context>
      <LoginPage {...props} />
    </i18nStart.Context>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
