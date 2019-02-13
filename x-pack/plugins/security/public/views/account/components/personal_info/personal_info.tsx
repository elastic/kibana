/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { User } from '../../../../../common/model/user';

interface Props {
  user: User;
}

export const PersonalInfo = (props: Props) => {
  return (
    <EuiDescribedFormGroup
      title={
        <h3>
          <FormattedMessage
            id="xpack.security.account.usernameGroupTitle"
            defaultMessage="Username and email"
          />
        </h3>
      }
      description={
        <FormattedMessage
          id="xpack.security.account.usernameGroupDescription"
          defaultMessage="This info cannot be changed. Contact your administrator for details."
        />
      }
    >
      <EuiFormRow>
        <EuiText>
          <p>
            <strong title="username">{props.user.username}</strong>
            <EuiSpacer size="s" />
            <strong title="password">
              {props.user.email || (
                <FormattedMessage
                  id="xpack.security.account.noEmailAddress"
                  defaultMessage="(no email address)"
                />
              )}
            </strong>
          </p>
        </EuiText>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
