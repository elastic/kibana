/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ToastsApi } from 'kibana/public';
import React, { useState, useEffect } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { Alert, AlertInstanceSummary } from '../../../../types';
import { useAppDependencies } from '../../../app_context';
import {
  ComponentOpts as AlertApis,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import { AlertInstancesWithApi as AlertInstances } from './alert_instances';

type WithAlertInstanceSummaryProps = {
  alert: Alert;
  readOnly: boolean;
  requestRefresh: () => Promise<void>;
} & Pick<AlertApis, 'loadAlertInstanceSummary'>;

export const AlertInstancesRoute: React.FunctionComponent<WithAlertInstanceSummaryProps> = ({
  alert,
  readOnly,
  requestRefresh,
  loadAlertInstanceSummary: loadAlertInstanceSummary,
}) => {
  const { toastNotifications } = useAppDependencies();

  const [alertInstanceSummary, setAlertInstanceSummary] = useState<AlertInstanceSummary | null>(
    null
  );

  useEffect(() => {
    getAlertInstanceSummary(
      alert.id,
      loadAlertInstanceSummary,
      setAlertInstanceSummary,
      toastNotifications
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert]);

  return alertInstanceSummary ? (
    <AlertInstances
      requestRefresh={requestRefresh}
      alert={alert}
      readOnly={readOnly}
      alertInstanceSummary={alertInstanceSummary}
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

export async function getAlertInstanceSummary(
  alertId: string,
  loadAlertInstanceSummary: AlertApis['loadAlertInstanceSummary'],
  setAlertInstanceSummary: React.Dispatch<React.SetStateAction<AlertInstanceSummary | null>>,
  toastNotifications: Pick<ToastsApi, 'addDanger'>
) {
  try {
    const loadedInstanceSummary = await loadAlertInstanceSummary(alertId);
    setAlertInstanceSummary(loadedInstanceSummary);
  } catch (e) {
    toastNotifications.addDanger({
      title: i18n.translate(
        'xpack.triggersActionsUI.sections.alertDetails.unableToLoadAlertInstanceSummaryMessage',
        {
          defaultMessage: 'Unable to load alert instance summary: {message}',
          values: {
            message: e.message,
          },
        }
      ),
    });
  }
}

export const AlertInstancesRouteWithApi = withBulkAlertOperations(AlertInstancesRoute);
