/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ToastsApi } from 'kibana/public';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Rule, AlertSummary, RuleType } from '../../../../types';
import {
  ComponentOpts as AlertApis,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import { AlertsWithApi as Alerts } from './alerts';
import { useKibana } from '../../../../common/lib/kibana';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';

type WithAlertSummaryProps = {
  rule: Rule;
  ruleType: RuleType;
  readOnly: boolean;
  requestRefresh: () => Promise<void>;
  refreshToken?: number;
} & Pick<AlertApis, 'loadAlertSummary'>;

export const AlertsRoute: React.FunctionComponent<WithAlertSummaryProps> = ({
  rule,
  ruleType,
  readOnly,
  requestRefresh,
  loadAlertSummary: loadAlertSummary,
  refreshToken,
}) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [numberOfExecutions, setNumberOfExecutions] = useState(60);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const ruleID = useRef<string | null>(null);
  const refreshTokenRef = useRef(refreshToken);

  const getAlertSummaryWithLoadingState = useCallback(
    async (executions: number = numberOfExecutions) => {
      setIsLoadingChart(true);
      await getAlertSummary(ruleID.current!, loadAlertSummary, setAlertSummary, toasts, executions);
      setIsLoadingChart(false);
    },
    [setIsLoadingChart, ruleID, loadAlertSummary, setAlertSummary, toasts, numberOfExecutions]
  );

  useEffect(() => {
    if (ruleID.current !== rule.id) {
      ruleID.current = rule.id;
      getAlertSummaryWithLoadingState();
    }
  }, [rule, ruleID, getAlertSummaryWithLoadingState]);

  useEffect(() => {
    if (refreshTokenRef.current !== refreshToken) {
      refreshTokenRef.current = refreshToken;
      getAlertSummaryWithLoadingState();
    }
  }, [refreshToken, refreshTokenRef, getAlertSummaryWithLoadingState]);

  const onChangeDuration = useCallback(
    (executions: number) => {
      setNumberOfExecutions(executions);
      getAlertSummaryWithLoadingState(executions);
    },
    [getAlertSummaryWithLoadingState]
  );

  return alertSummary ? (
    <Alerts
      requestRefresh={requestRefresh}
      rule={rule}
      ruleType={ruleType}
      readOnly={readOnly}
      alertSummary={alertSummary}
      numberOfExecutions={numberOfExecutions}
      isLoadingChart={isLoadingChart}
      onChangeDuration={onChangeDuration}
    />
  ) : (
    <CenterJustifiedSpinner />
  );
};

export async function getAlertSummary(
  ruleId: string,
  loadAlertSummary: AlertApis['loadAlertSummary'],
  setAlertSummary: React.Dispatch<React.SetStateAction<AlertSummary | null>>,
  toasts: Pick<ToastsApi, 'addDanger'>,
  executionDuration?: number
) {
  try {
    const loadedSummary = await loadAlertSummary(ruleId, executionDuration);
    setAlertSummary(loadedSummary);
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

export const AlertsRouteWithApi = withBulkAlertOperations(AlertsRoute);
