/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFieldText, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { ChangePassword } from '../change_password';

interface Props {
  user: any;
}

export class SecurityPanel extends Component<Props, {}> {
  public render() {
    return (
      <EuiForm>
        <h3>Security</h3>
        <EuiSpacer />
        <ChangePassword user={this.props.user} />
      </EuiForm>
    );
  }
}
