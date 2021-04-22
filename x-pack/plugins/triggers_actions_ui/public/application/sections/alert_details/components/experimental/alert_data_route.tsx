/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ToastsApi } from 'kibana/public';
import React, { useState, useEffect } from 'react';
import { Alert, AlertType } from '../../../../../types';
import {
  ComponentOpts as AlertApis,
  withBulkAlertOperations,
} from '../../../common/components/with_bulk_alert_api_operations';
import { AlertDataTableWithApi } from './alert_data';
import { AlertDataHistogramWithApi } from './alert_data_histogram';
import { useKibana } from '../../../../../common/lib/kibana';
import { CenterJustifiedSpinner } from '../../../../components/center_justified_spinner';
import { AlertData } from '../../../../lib/alert_api';

type WithAlertDataProps = {
  alert: Alert;
  alertType: AlertType;
  readOnly: boolean;
  requestRefresh: () => Promise<void>;
} & Pick<AlertApis, 'loadAlertData'>;

export const AlertDataRoute: React.FunctionComponent<WithAlertDataProps> = ({
  alert,
  alertType,
  readOnly,
  requestRefresh,
  loadAlertData,
}) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [alertData, setAlertData] = useState<AlertData>({});

  useEffect(() => {
    getAlertData(alert.id, loadAlertData, setAlertData, toasts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert]);

  return alertData ? (
    <>
      <AlertDataHistogramWithApi alertData={alertData} />
      <AlertDataTableWithApi
        requestRefresh={requestRefresh}
        alert={alert}
        alertType={alertType}
        readOnly={readOnly}
        alertData={alertData}
      />
    </>
  ) : (
    <CenterJustifiedSpinner />
  );
};

export async function getAlertData(
  alertId: string,
  loadAlertData: AlertApis['loadAlertData'],
  setAlertData: React.Dispatch<React.SetStateAction<AlertData>>,
  toasts: Pick<ToastsApi, 'addDanger'>
) {
  try {
    setAlertData(await loadAlertData(alertId));
  } catch (e) {
    toasts.addDanger({
      title: i18n.translate(
        'xpack.triggersActionsUI.sections.alertDetails.experimentalAlertData.unableToLoadAlertDataMessage',
        {
          defaultMessage: 'Unable to load alert data: {message}',
          values: {
            message: e.message,
          },
        }
      ),
    });
  }
}

export const AlertDataRouteWithApi = withBulkAlertOperations(AlertDataRoute);
