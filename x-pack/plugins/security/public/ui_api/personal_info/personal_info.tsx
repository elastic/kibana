/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiFormRow, EuiText } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import type { AuthenticatedUser } from '../../../common/model';

export interface PersonalInfoProps {
  user: AuthenticatedUser;
}

export const PersonalInfo = (props: PersonalInfoProps) => {
  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <h2>
          <FormattedMessage
            id="xpack.security.account.usernameGroupTitle"
            defaultMessage="Username and email"
          />
        </h2>
      }
      description={
        <FormattedMessage
          id="xpack.security.account.usernameGroupDescription"
          defaultMessage="You can't change this information."
        />
      }
    >
      <EuiFormRow fullWidth>
        <EuiText size="s">
          <dl>
            <dt title="username" data-test-subj="username">
              {props.user.username}
            </dt>
            <dd title="email" data-test-subj="email">
              {props.user.email || (
                <FormattedMessage
                  id="xpack.security.account.noEmailMessage"
                  defaultMessage="no email address"
                />
              )}
            </dd>
          </dl>
        </EuiText>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
