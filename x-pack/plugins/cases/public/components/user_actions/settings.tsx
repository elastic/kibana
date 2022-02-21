/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { SettingsUserAction } from '../../../common/api';
import { UserActionBuilder, UserActionResponse } from './types';

import { createCommonUpdateUserActionBuilder } from './common';
import { DISABLED_SETTING, ENABLED_SETTING, SYNC_ALERTS_LC } from './translations';

function getSettingsLabel(userAction: UserActionResponse<SettingsUserAction>): ReactNode {
  if (userAction.payload.settings.syncAlerts) {
    return `${ENABLED_SETTING} ${SYNC_ALERTS_LC}`;
  } else {
    return `${DISABLED_SETTING} ${SYNC_ALERTS_LC}`;
  }
}

export const createSettingsUserActionBuilder: UserActionBuilder = ({
  userAction,
  handleOutlineComment,
}) => ({
  build: () => {
    const action = userAction as UserActionResponse<SettingsUserAction>;
    if (action?.payload?.settings?.syncAlerts !== undefined) {
      const commonBuilder = createCommonUpdateUserActionBuilder({
        userAction,
        handleOutlineComment,
        label: getSettingsLabel(action),
        icon: 'gear',
      });

      return commonBuilder.build();
    }

    // if new settings are introduced. they won't be rendered
    return [];
  },
});
