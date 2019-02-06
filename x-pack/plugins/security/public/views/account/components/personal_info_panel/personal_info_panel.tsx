/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFieldText, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';

interface Props {
  user: any;
}

export class PersonalInfoPanel extends Component<Props, {}> {
  public render() {
    return (
      <EuiForm>
        <h3>Personal Information</h3>
        <EuiSpacer />
        <EuiFormRow
          label={
            <FormattedMessage id="xpack.security.account.usernameLabel" defaultMessage="Username" />
          }
        >
          <EuiFieldText
            readOnly
            data-test-subj="usernameField"
            value={this.props.user.username}
            onChange={() => null}
          />
        </EuiFormRow>

        <EuiFormRow
          label={
            <FormattedMessage id="xpack.security.account.fullNameLabel" defaultMessage="Name" />
          }
        >
          <EuiFieldText
            readOnly
            data-test-subj="nameField"
            value={this.props.user.full_name || '<n/a>'}
            onChange={() => null}
          />
        </EuiFormRow>

        <EuiFormRow
          label={<FormattedMessage id="xpack.security.account.emailLabel" defaultMessage="Email" />}
        >
          <EuiFieldText
            readOnly
            data-test-subj="emailIdField"
            value={this.props.user.email || '<no email address>'}
            onChange={() => null}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
}
