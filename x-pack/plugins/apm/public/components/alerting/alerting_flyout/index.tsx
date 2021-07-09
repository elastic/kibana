/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { AlertType } from '../../../../common/alert_types';
import { getInitialAlertValues } from '../get_initial_alert_values';
import { ApmPluginStartDeps } from '../../../plugin';
import { useServiceName } from '../../../hooks/use_service_name';
import { ApmServiceContextProvider } from '../../../context/apm_service/apm_service_context';
interface Props {
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  alertType: AlertType | null;
}

export function AlertingFlyout(props: Props) {
  const { addFlyoutVisible, setAddFlyoutVisibility, alertType } = props;
  const serviceName = useServiceName();
  const { services } = useKibana<ApmPluginStartDeps>();
  const initialValues = getInitialAlertValues(alertType, serviceName);

  const onCloseAddFlyout = useCallback(() => setAddFlyoutVisibility(false), [
    setAddFlyoutVisibility,
  ]);

  const addAlertFlyout = useMemo(
    () =>
      alertType &&
      services.triggersActionsUi.getAddAlertFlyout({
        consumer: 'apm',
        onClose: onCloseAddFlyout,
        alertTypeId: alertType,
        canChangeTrigger: false,
        initialValues,
      }),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [alertType, onCloseAddFlyout, services.triggersActionsUi]
  );
  return (
    <>
      {addFlyoutVisible && (
        <ApmServiceContextProvider>{addAlertFlyout}</ApmServiceContextProvider>
      )}
    </>
  );
}
