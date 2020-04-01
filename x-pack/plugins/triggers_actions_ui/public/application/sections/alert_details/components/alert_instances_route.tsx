/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ToastsApi } from 'kibana/public';
import React, { useState, useEffect } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { Alert, AlertTaskState } from '../../../../types';
import { useAppDependencies } from '../../../app_context';
import {
  ComponentOpts as AlertApis,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import { AlertInstancesWithApi as AlertInstances } from './alert_instances';

type WithAlertStateProps = {
  alert: Alert;
  requestRefresh: () => Promise<void>;
} & Pick<AlertApis, 'loadAlertState'>;

export const AlertInstancesRoute: React.FunctionComponent<WithAlertStateProps> = ({
  alert,
  requestRefresh,
  loadAlertState,
}) => {
  const { http, toastNotifications } = useAppDependencies();

  const [alertState, setAlertState] = useState<AlertTaskState | null>(null);

  useEffect(() => {
    getAlertState(alert.id, loadAlertState, setAlertState, toastNotifications);
  }, [alert, http, loadAlertState, toastNotifications]);

  return alertState ? (
    <AlertInstances requestRefresh={requestRefresh} alert={alert} alertState={alertState} />
  ) : (
    <div
      style={{
        textAlign: 'center',
        margin: '4em 0em',
      }}
    >
      <EuiLoadingSpinner size="l" />
    </div>
  );
};

export async function getAlertState(
  alertId: string,
  loadAlertState: AlertApis['loadAlertState'],
  setAlertState: React.Dispatch<React.SetStateAction<AlertTaskState | null>>,
  toastNotifications: Pick<ToastsApi, 'addDanger'>
) {
  try {
    const loadedState = await loadAlertState(alertId);
    setAlertState(loadedState);
  } catch (e) {
    toastNotifications.addDanger({
      title: i18n.translate(
        'xpack.triggersActionsUI.sections.alertDetails.unableToLoadAlertStateMessage',
        {
          defaultMessage: 'Unable to load alert state: {message}',
          values: {
            message: e.message,
          },
        }
      ),
    });
  }
}

export const AlertInstancesRouteWithApi = withBulkAlertOperations(AlertInstancesRoute);
