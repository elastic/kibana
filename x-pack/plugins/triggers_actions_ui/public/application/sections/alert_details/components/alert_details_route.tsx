/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { ToastsApi } from 'kibana/public';
import { EuiSpacer } from '@elastic/eui';
import { Alert, AlertType, ActionType, ResolvedAlert } from '../../../../types';
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

type AlertDetailsRouteProps = RouteComponentProps<{
  ruleId: string;
}> &
  Pick<ActionApis, 'loadActionTypes'> &
  Pick<AlertApis, 'loadAlert' | 'loadAlertTypes' | 'resolveAlert'>;

export const AlertDetailsRoute: React.FunctionComponent<AlertDetailsRouteProps> = ({
  match: {
    params: { ruleId },
  },
  loadAlert,
  resolveAlert,
  loadAlertTypes,
  loadActionTypes,
}) => {
  const {
    http,
    notifications: { toasts },
    spaces,
  } = useKibana().services;

  const [alert, setAlert] = useState<Alert | null>(null);
  const [resolvedAlertResult, setResolvedAlertResult] = useState<ResolvedAlert | null>(null);
  const [alertType, setAlertType] = useState<AlertType | null>(null);
  const [actionTypes, setActionTypes] = useState<ActionType[] | null>(null);
  const [refreshToken, requestRefresh] = React.useState<number>();

  useEffect(() => {
    async function potentiallyRedirectBasedOnSavedObjectResolve() {
      const resolvedResult = await resolveAlert(ruleId);
      setResolvedAlertResult(resolvedResult);
      if (resolvedResult.outcome === 'aliasMatch' && spaces) {
        // This index pattern has been resolved from a legacy URL, we should redirect the user to the new URL and display a toast.]
        const path = `insightsAndAlerting/triggersActions/rule/${resolvedResult.savedObject.id}`;
        const objectNoun = 'rule'; // TODO: i18n
        spaces.ui.redirectLegacyUrl(path, objectNoun);
        return false;
      }
      return true;
    }
    potentiallyRedirectBasedOnSavedObjectResolve().then((result: boolean) =>
      result
        ? getAlertData(
            ruleId,
            loadAlert,
            resolveAlert,
            loadAlertTypes,
            loadActionTypes,
            setAlert,
            setAlertType,
            setActionTypes,
            toasts
          )
        : undefined
    );
  }, [
    ruleId,
    http,
    loadActionTypes,
    loadAlert,
    resolveAlert,
    loadAlertTypes,
    toasts,
    spaces,
    refreshToken,
  ]);

  const getLegacyUrlConflictCallout = () => {
    if (
      resolvedAlertResult?.outcome === 'conflict' &&
      resolvedAlertResult?.aliasTargetId &&
      spaces
    ) {
      // We have resolved to one index pattern, but there is another one with a legacy URL associated with this page. We should display a
      // callout with a warning for the user, and provide a way for them to navigate to the other index pattern.
      const otherObjectId = resolvedAlertResult.aliasTargetId;
      const otherObjectPath = `insightsAndAlerting/triggersActions/alerts/rule/${resolvedAlertResult.savedObject.id}`;
      return (
        <>
          <EuiSpacer />
          {spaces.ui.components.getLegacyUrlConflict({
            objectNoun: 'rule', // TODO: i18n
            currentObjectId: ruleId,
            otherObjectId,
            otherObjectPath,
          })}
        </>
      );
    }
    return null;
  };

  return alert && alertType && actionTypes ? (
    <>
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={actionTypes}
        requestRefresh={async () => requestRefresh(Date.now())}
        getLegacyUrlConflictCallout={getLegacyUrlConflictCallout}
      />
    </>
  ) : (
    <CenterJustifiedSpinner />
  );
};

export async function getAlertData(
  alertId: string,
  loadAlert: AlertApis['loadAlert'],
  resolveAlert: AlertApis['resolveAlert'],
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

const AlertDetailsRouteWithApi = withActionOperations(withBulkAlertOperations(AlertDetailsRoute));
// eslint-disable-next-line import/no-default-export
export { AlertDetailsRouteWithApi as default };
