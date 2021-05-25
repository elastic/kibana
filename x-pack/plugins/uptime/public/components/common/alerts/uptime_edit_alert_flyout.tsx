/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import {
  Alert,
  TriggersAndActionsUIPublicPluginStart,
} from '../../../../../triggers_actions_ui/public';

interface Props {
  alertFlyoutVisible: boolean;
  initialAlert: Alert;
  setAlertFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

interface KibanaDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const UptimeEditAlertFlyoutComponent = ({
  alertFlyoutVisible,
  initialAlert,
  setAlertFlyoutVisibility,
}: Props) => {
  const { triggersActionsUi } = useKibana<KibanaDeps>().services;

  const EditAlertFlyout = useMemo(
    () =>
      triggersActionsUi.getEditAlertFlyout({
        initialAlert,
        onClose: () => {
          setAlertFlyoutVisibility(false);
        },
      }),
    [initialAlert, setAlertFlyoutVisibility, triggersActionsUi]
  );
  return <>{alertFlyoutVisible && EditAlertFlyout}</>;
};
