/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiLoadingSpinner } from '@elastic/eui';
import { ToastsApi } from 'kibana/public';
import { Alert, AlertType, ActionType } from '../../../../types';
import { useAppDependencies } from '../../../app_context';
import { AlertDetailsWithApi as AlertDetails } from './alert_details';
import { throwIfAbsent, throwIfIsntContained } from '../../../lib/value_validators';
import {
  ComponentOpts as AlertApis,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import {
  ComponentOpts as ActionApis,
  withActionOperations,
} from '../../common/components/with_actions_api_operations';

type AlertDetailsRouteProps = RouteComponentProps<{
  alertId: string;
}> &
  Pick<ActionApis, 'loadActionTypes'> &
  Pick<AlertApis, 'loadAlert' | 'loadAlertTypes'>;

export const AlertDetailsRoute: React.FunctionComponent<AlertDetailsRouteProps> = ({
  match: {
    params: { alertId },
  },
  loadAlert,
  loadAlertTypes,
  loadActionTypes,
}) => {
  const { http, toastNotifications } = useAppDependencies();

  const [alert, setAlert] = useState<Alert | null>(null);
  const [alertType, setAlertType] = useState<AlertType | null>(null);
  const [actionTypes, setActionTypes] = useState<ActionType[] | null>(null);
  const [refreshToken, requestRefresh] = React.useState<number>();
  useEffect(() => {
    getAlertData(
      alertId,
      loadAlert,
      loadAlertTypes,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toastNotifications
    );
  }, [alertId, http, loadActionTypes, loadAlert, loadAlertTypes, toastNotifications, refreshToken]);

  return alert && alertType && actionTypes ? (
    <AlertDetails
      alert={alert}
      alertType={alertType}
      actionTypes={actionTypes}
      requestRefresh={async () => requestRefresh(Date.now())}
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

export async function getAlertData(
  alertId: string,
  loadAlert: AlertApis['loadAlert'],
  loadAlertTypes: AlertApis['loadAlertTypes'],
  loadActionTypes: ActionApis['loadActionTypes'],
  setAlert: React.Dispatch<React.SetStateAction<Alert | null>>,
  setAlertType: React.Dispatch<React.SetStateAction<AlertType | null>>,
  setActionTypes: React.Dispatch<React.SetStateAction<ActionType[] | null>>,
  toastNotifications: Pick<ToastsApi, 'addDanger'>
) {
  try {
    const loadedAlert = await loadAlert(alertId);
    setAlert(loadedAlert);

    const [loadedAlertType, loadedActionTypes] = await Promise.all<AlertType, ActionType[]>([
      loadAlertTypes()
        .then(types => types.find(type => type.id === loadedAlert.alertTypeId))
        .then(throwIfAbsent(`Invalid Alert Type: ${loadedAlert.alertTypeId}`)),
      loadActionTypes().then(
        throwIfIsntContained(
          new Set(loadedAlert.actions.map(action => action.actionTypeId)),
          (requiredActionType: string) => `Invalid Action Type: ${requiredActionType}`,
          (action: ActionType) => action.id
        )
      ),
    ]);

    setAlertType(loadedAlertType);
    setActionTypes(loadedActionTypes);
  } catch (e) {
    toastNotifications.addDanger({
      title: i18n.translate(
        'xpack.triggersActionsUI.sections.alertDetails.unableToLoadAlertMessage',
        {
          defaultMessage: 'Unable to load alert: {message}',
          values: {
            message: e.message,
          },
        }
      ),
    });
  }
}

export const AlertDetailsRouteWithApi = withActionOperations(
  withBulkAlertOperations(AlertDetailsRoute)
);
