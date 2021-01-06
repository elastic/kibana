/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { CallOutMessage, CallOutSwitcher } from '../../../../common/components/callouts';
import { useUserData } from '../../user_info';

import * as i18n from './translations';

const readOnlyAccessToRulesMessage: CallOutMessage = {
  type: 'primary',
  id: 'read-only-access-to-rules',
  title: i18n.READ_ONLY_RULES_CALLOUT_TITLE,
  description: i18n.readOnlyRulesCallOutBody(),
};

const ReadOnlyRulesCallOutComponent = () => {
  const [{ canUserCRUD }] = useUserData();

  return (
    <CallOutSwitcher
      namespace="detections"
      condition={canUserCRUD != null && !canUserCRUD}
      message={readOnlyAccessToRulesMessage}
    />
  );
};

export const ReadOnlyRulesCallOut = memo(ReadOnlyRulesCallOutComponent);
