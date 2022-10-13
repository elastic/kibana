/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { CallOutMessage } from '../../../../common/components/callouts';
import { CallOutPersistentSwitcher } from '../../../../common/components/callouts';
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
 * and auto-update of signals or not. For this component to render the user must:
 * - Have the permissions to be able to read "signalIndexMappingOutdated" and that condition is "true"
 * - Have the permissions to be able to read "hasIndexManage" and that condition is "false"
 *
 * Some users do not have sufficient privileges to be able to determine if "signalIndexMappingOutdated"
 * is outdated or not. Same could apply to "hasIndexManage". When users do not have enough permissions
 * to determine if "signalIndexMappingOutdated" is true or false, the permissions system returns a "null"
 * instead.
 *
 * If the user has the permissions to see that signalIndexMappingOutdated is true and that
 * hasIndexManage is also true, then the user should be performing the update on the page which is
 * why we do not show it for that condition.
 */
const NeedAdminForUpdateCallOutComponent = (): JSX.Element | null => {
  const [{ signalIndexMappingOutdated, hasIndexManage }] = useUserData();

  const signalIndexMappingIsOutdated =
    signalIndexMappingOutdated != null && signalIndexMappingOutdated;

  const userDoesntHaveIndexManage = hasIndexManage != null && !hasIndexManage;
  const shouldShowCallout = signalIndexMappingIsOutdated && userDoesntHaveIndexManage;

  // Passing shouldShowCallout to the condition param will end up with an unecessary spacer being rendered
  return shouldShowCallout ? (
    <>
      <CallOutPersistentSwitcher condition={true} message={needAdminForUpdateRulesMessage} />
      <EuiSpacer size="l" />
    </>
  ) : null;
};

export const NeedAdminForUpdateRulesCallOut = memo(NeedAdminForUpdateCallOutComponent);
