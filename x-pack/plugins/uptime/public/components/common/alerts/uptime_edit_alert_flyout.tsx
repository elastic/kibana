/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Alert, AlertEdit } from '../../../../../../plugins/triggers_actions_ui/public';

interface Props {
  alertFlyoutVisible: boolean;
  initialAlert: Alert;
  setAlertFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const UptimeEditAlertFlyoutComponent = ({
  alertFlyoutVisible,
  initialAlert,
  setAlertFlyoutVisibility,
}: Props) => {
  const onClose = () => {
    setAlertFlyoutVisibility(false);
  };
  return alertFlyoutVisible ? <AlertEdit initialAlert={initialAlert} onClose={onClose} /> : null;
};
