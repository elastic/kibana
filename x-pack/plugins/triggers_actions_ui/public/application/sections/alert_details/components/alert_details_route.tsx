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
import { Alert, AlertType, ActionType, ResolvedRule } from '../../../../types';
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
  Pick<AlertApis, 'loadAlert' | 'loadAlertTypes' | 'resolveRule'>;

export const AlertDetailsRoute: React.FunctionComponent<AlertDetailsRouteProps> = ({
  match: {
    params: { ruleId },
  },
  loadAlert,
  loadAlertTypes,
  loadActionTypes,
  resolveRule,
}) => {
  const {
    http,
    notifications: { toasts },
    spaces: spacesApi,
  } = useKibana().services;

  const { basePath } = http;

  const [alert, setAlert] = useState<Alert | ResolvedRule | null>(null);
  const [alertType, setAlertType] = useState<AlertType | null>(null);
  const [actionTypes, setActionTypes] = useState<ActionType[] | null>(null);
  const [refreshToken, requestRefresh] = React.useState<number>();
  useEffect(() => {
    getRuleData(
      ruleId,
      loadAlert,
      loadAlertTypes,
      resolveRule,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toasts
    );
  }, [ruleId, http, loadActionTypes, loadAlert, loadAlertTypes, resolveRule, toasts, refreshToken]);

  useEffect(() => {
    if (alert) {
      const outcome = (alert as ResolvedRule).outcome;
      if (spacesApi && outcome === 'aliasMatch') {
        // This rule has been resolved from a legacy URL - redirect the user to the new URL and display a toast.
        const path = basePath.prepend(`insightsAndAlerting/triggersActions/rule/${alert.id}`);
        spacesApi.ui.redirectLegacyUrl(
          path,
          i18n.translate('xpack.triggersActionsUI.sections.alertDetails.redirectObjectNoun', {
            defaultMessage: 'rule',
          })
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert]);

  const getLegacyUrlConflictCallout = () => {
    const outcome = (alert as ResolvedRule).outcome;
    if (spacesApi && outcome === 'conflict') {
      const aliasTargetId = (alert as ResolvedRule).alias_target_id!; // This is always defined if outcome === 'conflict'
      // We have resolved to one rule, but there is another one with a legacy URL associated with this page. Display a
      // callout with a warning for the user, and provide a way for them to navigate to the other rule.
      const otherRulePath = basePath.prepend(
        `insightsAndAlerting/triggersActions/rule/${aliasTargetId}`
      );
      return (
        <>
          <EuiSpacer />
          {spacesApi.ui.components.getLegacyUrlConflict({
            objectNoun: i18n.translate(
              'xpack.triggersActionsUI.sections.alertDetails.redirectObjectNoun',
              {
                defaultMessage: 'rule',
              }
            ),
            currentObjectId: alert?.id!,
            otherObjectId: aliasTargetId,
            otherObjectPath: otherRulePath,
          })}
        </>
      );
    }
    return null;
  };

  return alert && alertType && actionTypes ? (
    <>
      {getLegacyUrlConflictCallout()}
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={actionTypes}
        requestRefresh={async () => requestRefresh(Date.now())}
      />
    </>
  ) : (
    <CenterJustifiedSpinner />
  );
};

export async function getRuleData(
  ruleId: string,
  loadAlert: AlertApis['loadAlert'],
  loadAlertTypes: AlertApis['loadAlertTypes'],
  resolveRule: AlertApis['resolveRule'],
  loadActionTypes: ActionApis['loadActionTypes'],
  setAlert: React.Dispatch<React.SetStateAction<Alert | ResolvedRule | null>>,
  setAlertType: React.Dispatch<React.SetStateAction<AlertType | null>>,
  setActionTypes: React.Dispatch<React.SetStateAction<ActionType[] | null>>,
  toasts: Pick<ToastsApi, 'addDanger'>
) {
  try {
    let loadedRule: Alert | ResolvedRule;
    try {
      loadedRule = await loadAlert(ruleId);
    } catch (err) {
      // Try resolving this rule id if the error is a 404, otherwise re-throw
      if (err?.body?.statusCode !== 404) {
        throw err;
      }
      loadedRule = await resolveRule(ruleId);
    }
    setAlert(loadedRule);

    const [loadedAlertType, loadedActionTypes] = await Promise.all<AlertType, ActionType[]>([
      loadAlertTypes()
        .then((types) => types.find((type) => type.id === loadedRule.alertTypeId))
        .then(throwIfAbsent(`Invalid Rule Type: ${loadedRule.alertTypeId}`)),
      loadActionTypes().then(
        throwIfIsntContained(
          new Set(loadedRule.actions.map((action) => action.actionTypeId)),
          (requiredActionType: string) => `Invalid Connector Type: ${requiredActionType}`,
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
