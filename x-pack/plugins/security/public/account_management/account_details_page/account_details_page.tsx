/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { ChangePassword } from './change_password';
import { PersonalInfo } from './personal_info';
import { AuthenticatedUser } from '../../../common/model';
import { UserAPIClient } from '../../management';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { NotificationsSetup } from '../../../../../../src/core/public';

export interface AccountDetailsPageProps {
  user: AuthenticatedUser;
  notifications: NotificationsSetup;
}

export const AccountDetailsPage: FunctionComponent<AccountDetailsPageProps> = ({
  user,
  notifications,
}) => {
  const { services } = useKibana();
  const userAPIClient = new UserAPIClient(services.http!);

  return (
    <>
      <PersonalInfo user={user} />
      <ChangePassword user={user} userAPIClient={userAPIClient} notifications={notifications} />
    </>
  );
};
