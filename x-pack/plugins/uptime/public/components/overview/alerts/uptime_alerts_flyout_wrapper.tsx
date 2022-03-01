/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
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
  const onCloseAlertFlyout = useCallback(
    () => setAlertFlyoutVisibility(false),
    [setAlertFlyoutVisibility]
  );
  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUi.getAddAlertFlyout({
        consumer: 'uptime',
        onClose: onCloseAlertFlyout,
        ruleTypeId: alertTypeId,
        canChangeTrigger: !alertTypeId,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onCloseAlertFlyout, alertTypeId]
  );

  return <>{alertFlyoutVisible && AddAlertFlyout}</>;
};
