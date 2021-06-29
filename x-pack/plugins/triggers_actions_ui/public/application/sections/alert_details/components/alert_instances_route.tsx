/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ToastsApi } from 'kibana/public';
import React, { useState, useEffect } from 'react';
import { Alert, AlertInstanceSummary, AlertType } from '../../../../types';
import {
  ComponentOpts as AlertApis,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import { AlertInstancesWithApi as AlertInstances } from './alert_instances';
import { useKibana } from '../../../../common/lib/kibana';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';

type WithAlertInstanceSummaryProps = {
  alert: Alert;
  alertType: AlertType;
  readOnly: boolean;
  requestRefresh: () => Promise<void>;
} & Pick<AlertApis, 'loadAlertInstanceSummary'>;

export const AlertInstancesRoute: React.FunctionComponent<WithAlertInstanceSummaryProps> = ({
  alert,
  alertType,
  readOnly,
  requestRefresh,
  loadAlertInstanceSummary: loadAlertInstanceSummary,
}) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [alertInstanceSummary, setAlertInstanceSummary] = useState<AlertInstanceSummary | null>(
    null
  );

  useEffect(() => {
    getAlertInstanceSummary(alert.id, loadAlertInstanceSummary, setAlertInstanceSummary, toasts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert]);

  return alertInstanceSummary ? (
    <AlertInstances
      requestRefresh={requestRefresh}
      alert={alert}
      alertType={alertType}
      readOnly={readOnly}
      alertInstanceSummary={alertInstanceSummary}
    />
  ) : (
    <CenterJustifiedSpinner />
  );
};

export async function getAlertInstanceSummary(
  alertId: string,
  loadAlertInstanceSummary: AlertApis['loadAlertInstanceSummary'],
  setAlertInstanceSummary: React.Dispatch<React.SetStateAction<AlertInstanceSummary | null>>,
  toasts: Pick<ToastsApi, 'addDanger'>
) {
  try {
    const loadedInstanceSummary = await loadAlertInstanceSummary(alertId);
    setAlertInstanceSummary(loadedInstanceSummary);
  } catch (e) {
    toasts.addDanger({
      title: i18n.translate(
        'xpack.triggersActionsUI.sections.alertDetails.unableToLoadAlertsMessage',
        {
          defaultMessage: 'Unable to load alerts: {message}',
          values: {
            message: e.message,
          },
        }
      ),
    });
  }
}

export const AlertInstancesRouteWithApi = withBulkAlertOperations(AlertInstancesRoute);
