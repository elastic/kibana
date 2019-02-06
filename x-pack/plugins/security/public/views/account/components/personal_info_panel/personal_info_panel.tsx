/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiDescriptionList, EuiFieldText, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { User } from '../../../../../common/model/user';

interface Props {
  user: User;
}

export class PersonalInfoPanel extends Component<Props, {}> {
  public render() {
    return (
      <div>
        <h3>Personal Information</h3>
        <EuiSpacer />
        <EuiDescriptionList
          textStyle="reverse"
          listItems={[
            {
              title: (
                <FormattedMessage
                  id="xpack.security.account.usernameLabel"
                  defaultMessage="Username"
                />
              ),
              description: this.props.user.username,
            },
            {
              title: (
                <FormattedMessage
                  id="xpack.security.account.fullNameLabel"
                  defaultMessage="Full Name"
                />
              ),
              description: this.props.user.full_name || (
                <FormattedMessage
                  id="xpack.security.account.noFullNameText"
                  defaultMessage="(n/a)"
                />
              ),
            },
            {
              title: (
                <FormattedMessage id="xpack.security.account.emailLabel" defaultMessage="Email" />
              ),
              description: this.props.user.email || (
                <FormattedMessage id="xpack.security.account.noEmailText" defaultMessage="(n/a)" />
              ),
            },
          ]}
        />
      </div>
    );
  }
}
