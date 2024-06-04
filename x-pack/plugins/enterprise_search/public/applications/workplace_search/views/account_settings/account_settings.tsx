/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useValues } from 'kea';

import { KibanaLogic } from '../../../shared/kibana/kibana_logic';
import { PersonalDashboardLayout } from '../../components/layout';
import { ACCOUNT_SETTINGS_TITLE } from '../../constants';

export const AccountSettings: React.FC = () => {
  const { user: currentUser, security } = useValues(KibanaLogic);

  const PersonalInfo = useMemo(() => security?.uiApi.components.getPersonalInfo, [security?.uiApi]);
  const ChangePassword = useMemo(
    () => security?.uiApi.components.getChangePassword,
    [security?.uiApi]
  );

  if (!currentUser) {
    return null;
  }

  return (
    <PersonalDashboardLayout pageChrome={[ACCOUNT_SETTINGS_TITLE]}>
      {PersonalInfo ? <PersonalInfo user={currentUser} /> : null}
      {ChangePassword ? <ChangePassword user={currentUser} /> : null}
    </PersonalDashboardLayout>
  );
};
