/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ToastsApi } from 'kibana/public';
import React, { useState, useEffect } from 'react';
import { EuiBasicTable, EuiHealth, EuiSpacer, EuiToolTip } from '@elastic/eui';

import { Alert as Rule, AlertType as RuleType } from '../../../../types';
import {
  ComponentOpts as RuleApis,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import { useKibana } from '../../../../common/lib/kibana';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';

type WithRuleMonitoringSummaryProps = {
  rule: Rule;
  ruleType: RuleType;
} & Pick<RuleApis, 'loadRuleMonitoringSummary'>;

export const RuleMonitoringSummary: React.FunctionComponent<WithRuleMonitoringSummaryProps> = ({
  rule,
  ruleType,
  loadRuleMonitoringSummary,
}) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [ruleMonitoringSummary, setRuleMonitoringSummary] = useState<any | null>(null);

  useEffect(() => {
    getRuleMonitoringSummary(rule.id, loadRuleMonitoringSummary, setRuleMonitoringSummary, toasts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule]);

  return ruleMonitoringSummary ? (
    <>
      <EuiSpacer size="xl" />
    </>
  ) : (
    <CenterJustifiedSpinner />
  );
};

export async function getRuleMonitoringSummary(
  ruleId: string,
  loadRuleMonitoringSummary: RuleApis['loadRuleMonitoringSummary'],
  setRuleMonitoringSummary: React.Dispatch<React.SetStateAction<any | null>>,
  toasts: Pick<ToastsApi, 'addDanger'>
) {
  try {
    const loadedSummary = await loadRuleMonitoringSummary(ruleId);
    setRuleMonitoringSummary(loadedSummary);
  } catch (e) {
    toasts.addDanger({
      title: i18n.translate(
        'xpack.triggersActionsUI.sections.alertDetails.unableToLoadAlertsMessage',
        {
          defaultMessage: 'Unable to load rule monitoring summary: {message}',
          values: {
            message: e.message,
          },
        }
      ),
    });
  }
}

export const RuleMonitoringSummaryWithApi = withBulkAlertOperations(RuleMonitoringSummary);
