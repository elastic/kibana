/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { CallOutMessage, CallOutSwitcher } from '../../../common/components/callouts';
import { useUserData } from '../user_info';

import * as i18n from './translations';

const readOnlyAccessToAlertsMessage: CallOutMessage = {
  type: 'primary',
  id: 'read-only-access-to-alerts',
  title: i18n.NO_WRITE_ALERTS_CALLOUT_TITLE,
  description: <p>{i18n.NO_WRITE_ALERTS_CALLOUT_MSG}</p>,
};

const NoWriteAlertsCallOutComponent = () => {
  const [{ hasIndexWrite }] = useUserData();

  return (
    <CallOutSwitcher
      namespace="detections"
      condition={hasIndexWrite != null && !hasIndexWrite}
      message={readOnlyAccessToAlertsMessage}
    />
  );
};

export const NoWriteAlertsCallOut = memo(NoWriteAlertsCallOutComponent);
