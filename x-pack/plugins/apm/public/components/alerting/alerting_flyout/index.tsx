/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { AlertType } from '../../../../common/alert_types';
import { TriggersAndActionsUIPublicPluginStart } from '../../../../../triggers_actions_ui/public';

interface Props {
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  alertType: AlertType | null;
}

interface KibanaDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export function AlertingFlyout(props: Props) {
  const { addFlyoutVisible, setAddFlyoutVisibility, alertType } = props;
  const {
    services: { triggersActionsUi },
  } = useKibana<KibanaDeps>();

  const onCloseAddFlyout = useCallback(() => setAddFlyoutVisibility(false), [
    setAddFlyoutVisibility,
  ]);

  const addAlertFlyout = useMemo(
    () =>
      alertType &&
      triggersActionsUi.getAddAlertFlyout({
        consumer: 'apm',
        onClose: onCloseAddFlyout,
        alertTypeId: alertType,
        canChangeTrigger: false,
      }),
    [alertType, onCloseAddFlyout, triggersActionsUi]
  );
  return <>{addFlyoutVisible && addAlertFlyout}</>;
}
