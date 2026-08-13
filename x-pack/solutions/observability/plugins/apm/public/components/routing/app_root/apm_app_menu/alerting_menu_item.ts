/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuItemType, AppMenuPopoverItem } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { APM_APP_MENU_EBT_ACTIONS, apmAppMenuEbt } from './ebt_constants';

const alertLabel = i18n.translate('xpack.apm.home.alertsMenu.alerts', {
  defaultMessage: 'Alerts',
});

const createThresholdAlertLabel = i18n.translate('xpack.apm.home.alertsMenu.createThresholdAlert', {
  defaultMessage: 'Create threshold rule',
});

const createAnomalyAlertLabel = i18n.translate('xpack.apm.home.alertsMenu.createAnomalyAlert', {
  defaultMessage: 'Create anomaly rule',
});

const errorCountLabel = i18n.translate('xpack.apm.home.alertsMenu.errorCount', {
  defaultMessage: 'Create error count rule',
});

const transactionDurationLabel = i18n.translate('xpack.apm.home.alertsMenu.transactionDuration', {
  defaultMessage: 'Latency',
});

const transactionErrorRateLabel = i18n.translate('xpack.apm.home.alertsMenu.transactionErrorRate', {
  defaultMessage: 'Failed transaction rate',
});

const manageRulesLabel = i18n.translate('xpack.apm.home.alertsMenu.viewActiveAlerts', {
  defaultMessage: 'Manage rules',
});

export function getAlertingMenuItem({
  isAlertingAvailable,
  canSaveApmAlerts,
  canReadAlerts,
  canReadMlJobs,
  manageRulesHref,
  onCreateRule,
  order,
}: {
  isAlertingAvailable: boolean;
  canSaveApmAlerts: boolean;
  canReadAlerts: boolean;
  canReadMlJobs: boolean;
  manageRulesHref?: string;
  onCreateRule: (ruleType: ApmRuleType) => void;
  order: number;
}): AppMenuItemType | undefined {
  if (!isAlertingAvailable) {
    return undefined;
  }

  const alertItems: AppMenuPopoverItem[] = [];

  if (canSaveApmAlerts) {
    alertItems.push({
      id: 'createThreshold',
      label: createThresholdAlertLabel,
      testId: 'apmAlertsMenuItemCreateThreshold',
      ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.OPEN_CREATE_THRESHOLD_RULE_MENU),
      items: [
        {
          id: 'createLatencyRule',
          label: transactionDurationLabel,
          ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.CREATE_LATENCY_RULE),
          run: () => {
            onCreateRule(ApmRuleType.TransactionDuration);
          },
        },
        {
          id: 'createFailedTransactionRateRule',
          label: transactionErrorRateLabel,
          ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.CREATE_FAILED_TRANSACTION_RATE_RULE),
          run: () => {
            onCreateRule(ApmRuleType.TransactionErrorRate);
          },
        },
      ],
    });

    if (canReadMlJobs) {
      alertItems.push({
        id: 'createAnomalyRule',
        label: createAnomalyAlertLabel,
        testId: 'apmAlertsMenuItemCreateAnomaly',
        ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.CREATE_ANOMALY_RULE),
        run: () => {
          onCreateRule(ApmRuleType.Anomaly);
        },
      });
    }

    alertItems.push({
      id: 'createErrorCountRule',
      label: errorCountLabel,
      testId: 'apmAlertsMenuItemErrorCount',
      ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.CREATE_ERROR_COUNT_RULE),
      run: () => {
        onCreateRule(ApmRuleType.ErrorCount);
      },
    });
  }

  if (canReadAlerts && manageRulesHref) {
    alertItems.push({
      id: 'manageRules',
      label: manageRulesLabel,
      iconType: 'tableOfContents',
      href: manageRulesHref,
      ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.MANAGE_RULES),
      testId: 'apmAlertsMenuItemManageRules',
    });
  }

  if (alertItems.length === 0) {
    return undefined;
  }

  return {
    id: 'alerts',
    label: alertLabel,
    iconType: 'bell',
    testId: 'apmAlertAndRulesHeaderLink',
    ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.OPEN_ALERTS_MENU),
    items: alertItems,
    order,
  };
}
