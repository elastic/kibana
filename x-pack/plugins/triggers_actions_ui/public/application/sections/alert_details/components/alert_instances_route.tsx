/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ToastsApi } from 'kibana/public';
import React, { useState, useEffect } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { Alert, AlertStatus } from '../../../../types';
import { useAppDependencies } from '../../../app_context';
import {
  ComponentOpts as AlertApis,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import { AlertInstancesWithApi as AlertInstances } from './alert_instances';

type WithAlertStatusProps = {
  alert: Alert;
  readOnly: boolean;
  requestRefresh: () => Promise<void>;
} & Pick<AlertApis, 'loadAlertStatus'>;

export const AlertInstancesRoute: React.FunctionComponent<WithAlertStatusProps> = ({
  alert,
  readOnly,
  requestRefresh,
  loadAlertStatus: loadAlertStatus,
}) => {
  const { toastNotifications } = useAppDependencies();

  const [alertStatus, setAlertStatus] = useState<AlertStatus | null>(null);

  useEffect(() => {
    getAlertStatus(alert.id, loadAlertStatus, setAlertStatus, toastNotifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert]);

  return alertStatus ? (
    <AlertInstances
      requestRefresh={requestRefresh}
      alert={alert}
      readOnly={readOnly}
      alertStatus={alertStatus}
    />
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

export async function getAlertStatus(
  alertId: string,
  loadAlertStatus: AlertApis['loadAlertStatus'],
  setAlertStatus: React.Dispatch<React.SetStateAction<AlertStatus | null>>,
  toastNotifications: Pick<ToastsApi, 'addDanger'>
) {
  try {
    const loadedStatus = await loadAlertStatus(alertId);
    setAlertStatus(loadedStatus);
  } catch (e) {
    toastNotifications.addDanger({
      title: i18n.translate(
        'xpack.triggersActionsUI.sections.alertDetails.unableToLoadAlertStateMessage',
        {
          defaultMessage: 'Unable to load alert status: {message}',
          values: {
            message: e.message,
          },
        }
      ),
    });
  }
}

export const AlertInstancesRouteWithApi = withBulkAlertOperations(AlertInstancesRoute);
