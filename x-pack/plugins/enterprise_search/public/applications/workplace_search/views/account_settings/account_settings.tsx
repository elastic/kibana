/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import { useValues } from 'kea';

import {
  UserAPIClient,
  ChangePassword,
  PersonalInfo,
  AuthenticatedUser,
} from '../../../../../../security/public';
import { HttpLogic } from '../../../shared/http/http_logic';
import { KibanaLogic } from '../../../shared/kibana/kibana_logic';

export const AccountSettings: React.FC = () => {
  const { security, notifications } = useValues(KibanaLogic);
  const { http } = useValues(HttpLogic);

  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    security.authc.getCurrentUser().then(setCurrentUser);
  }, [security.authc]);

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <PersonalInfo user={currentUser} />
      <ChangePassword
        user={currentUser}
        userAPIClient={new UserAPIClient(http)}
        notifications={notifications}
      />
    </>
  );
};
