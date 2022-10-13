/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';

import { useValues } from 'kea';

import type { AuthenticatedUser } from '@kbn/security-plugin/public';

import { KibanaLogic } from '../../../shared/kibana/kibana_logic';
import { PersonalDashboardLayout } from '../../components/layout';
import { ACCOUNT_SETTINGS_TITLE } from '../../constants';

export const AccountSettings: React.FC = () => {
  const { security } = useValues(KibanaLogic);

  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    security.authc
      .getCurrentUser()
      .then(setCurrentUser)
      .catch(() => {
        setCurrentUser(null);
      });
  }, [security.authc]);

  const PersonalInfo = useMemo(() => security.uiApi.components.getPersonalInfo, [security.uiApi]);
  const ChangePassword = useMemo(
    () => security.uiApi.components.getChangePassword,
    [security.uiApi]
  );

  if (!currentUser) {
    return null;
  }

  return (
    <PersonalDashboardLayout pageChrome={[ACCOUNT_SETTINGS_TITLE]}>
      <PersonalInfo user={currentUser} />
      <ChangePassword user={currentUser} />
    </PersonalDashboardLayout>
  );
};
