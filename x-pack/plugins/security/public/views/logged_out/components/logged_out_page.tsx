/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiIcon, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import React, { Component } from 'react';

export class LoggedOutPage extends Component<{}, {}> {
  public render() {
    return (
      <I18nProvider>
        <div className="loggedOut">
          <header className="loggedOut__header">
            <div className="loggedOut__content eui-textCenter">
              <EuiSpacer size="xxl" />
              <span className="loggedOut__logo">
                <EuiIcon type="logoKibana" size="xxl" />
              </span>
              <EuiTitle size="l" className="loggedOut__title">
                <h1>
                  <FormattedMessage
                    id="kbn.loggedOut.title"
                    defaultMessage="Successfully logged out"
                  />
                </h1>
              </EuiTitle>
              <EuiSpacer size="xl" />
            </div>
          </header>
          <div className="loggedOut__content eui-textCenter">
            <EuiButton href="/login">Login</EuiButton>
          </div>
        </div>
      </I18nProvider>
    );
  }
}
