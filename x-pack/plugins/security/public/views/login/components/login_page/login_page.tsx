/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

// @ts-ignore
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';

import {
  // @ts-ignore
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import classNames from 'classnames';
import { LoginState } from '../../../../../common/login_state';
import { BasicLoginForm } from '../basic_login_form';
import { DisabledLoginForm } from '../disabled_login_form';

interface Props {
  http: any;
  window: any;
  next: string;
  infoMessage?: string;
  loginState: LoginState;
  isSecureConnection: boolean;
  requiresSecureConnection: boolean;
}

export class LoginPage extends Component<Props, {}> {
  public render() {
    const allowLogin = this.allowLogin();

    const contentHeaderClasses = classNames('loginWelcome__content', 'eui-textCenter', {
      ['loginWelcome__contentDisabledForm']: !allowLogin,
    });

    const contentBodyClasses = classNames('loginWelcome__content', 'loginWelcome-body', {
      ['loginWelcome__contentDisabledForm']: !allowLogin,
    });

    return (
      <I18nProvider>
        <div className="loginWelcome login-form">
          <header className="loginWelcome__header">
            <div className={contentHeaderClasses}>
              <EuiSpacer size="xxl" />
              <span className="loginWelcome__logo">
                <EuiIcon type="logoKibana" size="xxl" />
              </span>
              <EuiTitle size="l" className="loginWelcome__title">
                <h1>
                  <FormattedMessage
                    id="kbn.login.welcomeTitle"
                    defaultMessage="Welcome to Kibana"
                  />
                </h1>
              </EuiTitle>
              <EuiText size="s" color="subdued" className="loginWelcome__subtitle">
                <p>
                  <FormattedMessage
                    id="kbn.login.welcomeDescription"
                    defaultMessage="Your window into the Elastic Stack"
                  />
                </p>
              </EuiText>
              <EuiSpacer size="xl" />
            </div>
          </header>
          <div className={contentBodyClasses}>
            <EuiFlexGroup gutterSize="l">
              <EuiFlexItem>{this.getLoginForm()}</EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
      </I18nProvider>
    );
  }

  private allowLogin = () => {
    if (this.props.requiresSecureConnection && !this.props.isSecureConnection) {
      return false;
    }

    return this.props.loginState.allowLogin && this.props.loginState.layout === 'form';
  };

  private getLoginForm = () => {
    if (this.props.requiresSecureConnection && !this.props.isSecureConnection) {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="kbn.login.requiresSecureConnectionTitle"
              defaultMessage="A secure connection is required for log in"
            />
          }
          message={
            <FormattedMessage
              id="kbn.login.requiresSecureConnectionMessage"
              defaultMessage="Contact your system administrator."
            />
          }
        />
      );
    }

    const layout = this.props.loginState.layout;
    switch (layout) {
      case 'form':
        return <BasicLoginForm {...this.props} />;
      case 'error-es-unavailable':
        return (
          <DisabledLoginForm
            title={
              <FormattedMessage
                id="kbn.login.esUnavailableTitle"
                defaultMessage="Cannot connect to the Elastiscearch cluster"
              />
            }
            message={
              <FormattedMessage
                id="kbn.login.esUnavailableMessage"
                defaultMessage="See the Kibana logs for details and try reloading the page."
              />
            }
          />
        );
      case 'error-xpack-unavailable':
        return (
          <DisabledLoginForm
            title={
              <FormattedMessage
                id="kbn.login.xpackUnavailableTitle"
                defaultMessage="Cannot connect to the Elasticsearch cluster currently configured for Kibana."
              />
            }
            message={
              <FormattedMessage
                id="kbn.login.xpackUnavailableMessage"
                defaultMessage="To use the full set of free features in this distribution of Kibana, please update Elasticsearch to the default distribution."
              />
            }
          />
        );
      default:
        return (
          <DisabledLoginForm
            title={
              <FormattedMessage
                id="kbn.login.unknownLayoutTitle"
                defaultMessage="Unsupported login form layout."
              />
            }
            message={
              <FormattedMessage
                id="kbn.login.unknownLayoutMessage"
                defaultMessage="Refer to the Kibana logs for more details and refresh to try again."
              />
            }
          />
        );
    }
  };
}
