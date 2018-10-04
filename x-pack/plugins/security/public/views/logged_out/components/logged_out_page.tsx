/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import React, { Component } from 'react';

export class LoggedOutPage extends Component<Props, {}> {
  public render() {
    return (
      <I18nProvider>
        <FormattedMessage id="kbn.loggedOut.title" defaultMessage="You've been logged out" />
      </I18nProvider>
    );
  }
}
