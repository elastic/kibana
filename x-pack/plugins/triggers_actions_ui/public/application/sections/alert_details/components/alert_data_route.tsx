/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { ToastsApi } from 'kibana/public';
import { Alert, AlertType, ActionType } from '../../../../types';
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
import { useKibana } from '../../../../common/lib/kibana';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';

type AlertDataRouteProps = RouteComponentProps<{
  ruleId: string;
}> &
  Pick<ActionApis, 'loadActionTypes'> &
  Pick<AlertApis, 'loadAlert' | 'loadAlertTypes'>;

export const AlertDataRoute: React.FunctionComponent<AlertDataRouteProps> = ({
  match: {
    params: { ruleId },
  },
  loadAlert,
  loadAlertTypes,
  loadActionTypes,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [alert, setAlert] = useState<Alert | null>(null);
  const [alertType, setAlertType] = useState<AlertType | null>(null);
  const [actionTypes, setActionTypes] = useState<ActionType[] | null>(null);
  const [refreshToken, requestRefresh] = React.useState<number>();
  useEffect(() => {
    getAlertData(
      ruleId,
      loadAlert,
      loadAlertTypes,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toasts
    );
  }, [ruleId, http, loadActionTypes, loadAlert, loadAlertTypes, toasts, refreshToken]);

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.observability.alertsDisclaimerTitle', {
          defaultMessage: 'Experimental',
        })}
        color="warning"
        iconType="beaker"
      >
        <p>
          {i18n.translate('xpack.observability.alertsDisclaimerText', {
            defaultMessage:
              'This page shows an experimental alerting view. The data shown here will probably not be an accurate representation of alerts.',
          })}
        </p>
      </EuiCallOut>
      {alert && alertType && actionTypes ? (
        <AlertDetails
          alert={alert}
          alertType={alertType}
          actionTypes={actionTypes}
          requestRefresh={async () => requestRefresh(Date.now())}
        />
      ) : (
        <CenterJustifiedSpinner />
      )}
    </>
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
  toasts: Pick<ToastsApi, 'addDanger'>
) {
  try {
    const loadedAlert = await loadAlert(alertId);
    setAlert(loadedAlert);

    const [loadedAlertType, loadedActionTypes] = await Promise.all<AlertType, ActionType[]>([
      loadAlertTypes()
        .then((types) => types.find((type) => type.id === loadedAlert.alertTypeId))
        .then(throwIfAbsent(`Invalid Alert Type: ${loadedAlert.alertTypeId}`)),
      loadActionTypes().then(
        throwIfIsntContained(
          new Set(loadedAlert.actions.map((action) => action.actionTypeId)),
          (requiredActionType: string) => `Invalid Action Type: ${requiredActionType}`,
          (action: ActionType) => action.id
        )
      ),
    ]);

    setAlertType(loadedAlertType);
    setActionTypes(loadedActionTypes);
  } catch (e) {
    toasts.addDanger({
      title: i18n.translate(
        'xpack.triggersActionsUI.sections.alertDetails.unableToLoadAlertMessage',
        {
          defaultMessage: 'Unable to load rule: {message}',
          values: {
            message: e.message,
          },
        }
      ),
    });
  }
}

const AlertDataRouteWithApi = withActionOperations(withBulkAlertOperations(AlertDataRoute));
// eslint-disable-next-line import/no-default-export
export { AlertDataRouteWithApi as default };
