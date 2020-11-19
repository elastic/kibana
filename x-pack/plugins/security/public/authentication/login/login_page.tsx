/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './login_page.scss';

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import { BehaviorSubject } from 'rxjs';
import { parse } from 'url';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { CoreStart, FatalErrorsStart, HttpStart, NotificationsStart } from 'src/core/public';
import { LoginState } from '../../../common/login_state';
import { LoginForm, DisabledLoginForm } from './components';

interface Props {
  http: HttpStart;
  notifications: NotificationsStart;
  fatalErrors: FatalErrorsStart;
  loginAssistanceMessage: string;
}

interface State {
  loginState: LoginState | null;
}

const infoMessageMap = new Map([
  [
    'SESSION_EXPIRED',
    i18n.translate('xpack.security.login.sessionExpiredDescription', {
      defaultMessage: 'Your session has timed out. Please log in again.',
    }),
  ],
  [
    'LOGGED_OUT',
    i18n.translate('xpack.security.login.loggedOutDescription', {
      defaultMessage: 'You have logged out of Elastic.',
    }),
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

    return (
      <LoginForm
        http={this.props.http}
        notifications={this.props.notifications}
        selector={selector}
        infoMessage={infoMessageMap.get(parse(window.location.href, true).query.msg?.toString())}
        loginAssistanceMessage={this.props.loginAssistanceMessage}
        loginHelp={loginHelp}
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
