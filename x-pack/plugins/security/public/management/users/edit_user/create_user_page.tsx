/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiHorizontalRule,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import { useHistory } from 'react-router-dom';

import { FormattedMessage } from '@kbn/i18n/react';

import { UserForm } from './user_form';

export const CreateUserPage: FunctionComponent = () => {
  const history = useHistory();
  const backToUsers = () => history.push('/');

  return (
    <EuiPageContent>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h1>
              <FormattedMessage
                id="xpack.security.management.users.createUserPage.title"
                defaultMessage="Create user"
              />
            </h1>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        <EuiHorizontalRule />
        <UserForm isNewUser onCancel={backToUsers} onSuccess={backToUsers} />
      </EuiPageContentBody>
    </EuiPageContent>
  );
};
