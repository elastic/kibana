/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AlertAdd } from '../../../../../../plugins/triggers_actions_ui/public';

interface Props {
  alertFlyoutVisible: boolean;
  alertTypeId?: string;
  setAlertFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const UptimeAlertsFlyoutWrapperComponent = ({
  alertFlyoutVisible,
  alertTypeId,
  setAlertFlyoutVisibility,
}: Props) => (
  <AlertAdd
    addFlyoutVisible={alertFlyoutVisible}
    consumer="uptime"
    setAddFlyoutVisibility={setAlertFlyoutVisibility}
    alertTypeId={alertTypeId}
    // if we don't have an alert type pre-specified, we need to
    // let the user choose
    canChangeTrigger={!alertTypeId}
  />
);
