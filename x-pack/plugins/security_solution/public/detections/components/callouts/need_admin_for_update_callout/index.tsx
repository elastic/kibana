/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { CallOutMessage, CallOutPersistentSwitcher } from '../../../../common/components/callouts';
import { useUserData } from '../../user_info';

import * as i18n from './translations';

const needAdminForUpdateRulesMessage: CallOutMessage = {
  type: 'primary',
  id: 'need-admin-for-update-rules',
  title: i18n.NEED_ADMIN_CALLOUT_TITLE,
  description: i18n.needAdminForUpdateCallOutBody(),
};

/**
 * Callout component that lets the user know that an administrator is needed for performing
 * and auto-update of signals or not.
 */
const NeedAdminForUpdateCallOutComponent = (): JSX.Element => {
  const [{ signalIndexMappingOutdated }] = useUserData();

  return (
    <CallOutPersistentSwitcher
      condition={signalIndexMappingOutdated != null && signalIndexMappingOutdated}
      message={needAdminForUpdateRulesMessage}
    />
  );
};

export const NeedAdminForUpdateRulesCallOut = memo(NeedAdminForUpdateCallOutComponent);
