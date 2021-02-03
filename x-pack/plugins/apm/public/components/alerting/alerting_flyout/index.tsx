/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { AlertType } from '../../../../common/alert_types';
import { getInitialAlertValues } from '../get_initial_alert_values';
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
  const { serviceName } = useParams<{ serviceName?: string }>();
  const {
    services: { triggersActionsUi },
  } = useKibana<KibanaDeps>();

  const initialValues = getInitialAlertValues(alertType, serviceName);

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
        initialValues,
      }),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [alertType, onCloseAddFlyout, triggersActionsUi]
  );
  return <>{addFlyoutVisible && addAlertFlyout}</>;
}
