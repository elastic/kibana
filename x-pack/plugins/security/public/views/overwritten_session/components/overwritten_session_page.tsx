/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiIcon, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';

export interface Props {
  addBasePath: (path: string) => string;
  user: User;
}

interface User {
  username: string;
}

export class OverwrittenSessionPage extends Component<Props, {}> {
  public render() {
    return (
      <div className="overwrittenSession">
        <header className="overwrittenSession__header">
          <div className="overwrittenSession__content eui-textCenter">
            <EuiSpacer size="xxl" />
            <span className="overwrittenSession__logo">
              <EuiIcon type="logoKibana" size="xxl" />
            </span>
            <EuiTitle size="m" className="overwrittenSession__title">
              <h1>
                <FormattedMessage
                  id="xpack.security.overwrittenSession.title"
                  defaultMessage="You had an active session previously, but logged in as a different user."
                />
              </h1>
            </EuiTitle>
            <EuiSpacer size="m" />
          </div>
        </header>
        <div className="overwrittenSession__content eui-textCenter">
          <EuiButton href={this.props.addBasePath('/')}>
            <FormattedMessage
              id="xpack.security.overwrittenSession.continueAsUserText"
              defaultMessage="Continue as {username}"
              values={{ username: this.props.user.username }}
            />
          </EuiButton>
        </div>
      </div>
    );
  }
}
