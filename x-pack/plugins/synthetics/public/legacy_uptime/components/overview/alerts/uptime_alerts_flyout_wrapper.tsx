/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

interface Props {
  alertFlyoutVisible: boolean;
  alertTypeId?: string;
  setAlertFlyoutVisibility: (value: boolean) => void;
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
