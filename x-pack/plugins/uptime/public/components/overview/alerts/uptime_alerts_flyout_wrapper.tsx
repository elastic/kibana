/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { TriggersAndActionsUIPublicPluginStart } from '../../../../../../plugins/triggers_actions_ui/public';

interface Props {
  alertFlyoutVisible: boolean;
  alertTypeId?: string;
  setAlertFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

interface KibanaDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const UptimeAlertsFlyoutWrapperComponent = ({
  alertFlyoutVisible,
  alertTypeId,
  setAlertFlyoutVisibility,
}: Props) => {
  const { triggersActionsUi } = useKibana<KibanaDeps>().services;

  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUi.getAddAlertFlyout({
        consumer: 'uptime',
        addFlyoutVisible: alertFlyoutVisible,
        setAddFlyoutVisibility: setAlertFlyoutVisibility,
        alertTypeId,
        canChangeTrigger: !alertTypeId,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alertFlyoutVisible, alertTypeId]
  );

  return <>{AddAlertFlyout}</>;
};
