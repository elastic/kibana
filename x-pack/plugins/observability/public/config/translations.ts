/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const translations = {
  alertsTable: {
    viewDetailsTextLabel: i18n.translate('xpack.observability.alertsTable.viewDetailsTextLabel', {
      defaultMessage: 'View details',
    }),
    viewInAppTextLabel: i18n.translate('xpack.observability.alertsTable.viewInAppTextLabel', {
      defaultMessage: 'View in app',
    }),
    moreActionsTextLabel: i18n.translate('xpack.observability.alertsTable.moreActionsTextLabel', {
      defaultMessage: 'More actions',
    }),
    notEnoughPermissions: i18n.translate('xpack.observability.alertsTable.notEnoughPermissions', {
      defaultMessage: 'Additional privileges required',
    }),
    statusColumnDescription: i18n.translate(
      'xpack.observability.alertsTGrid.statusColumnDescription',
      {
        defaultMessage: 'Alert Status',
      }
    ),
    lastUpdatedColumnDescription: i18n.translate(
      'xpack.observability.alertsTGrid.lastUpdatedColumnDescription',
      {
        defaultMessage: 'Last updated',
      }
    ),
    durationColumnDescription: i18n.translate(
      'xpack.observability.alertsTGrid.durationColumnDescription',
      {
        defaultMessage: 'Duration',
      }
    ),
    reasonColumnDescription: i18n.translate(
      'xpack.observability.alertsTGrid.reasonColumnDescription',
      {
        defaultMessage: 'Reason',
      }
    ),
    actionsTextLabel: i18n.translate('xpack.observability.alertsTable.actionsTextLabel', {
      defaultMessage: 'Actions',
    }),
    loadingTextLabel: i18n.translate('xpack.observability.alertsTable.loadingTextLabel', {
      defaultMessage: 'loading alerts',
    }),
    footerTextLabel: i18n.translate('xpack.observability.alertsTable.footerTextLabel', {
      defaultMessage: 'alerts',
    }),
    showingAlertsTitle: (totalAlerts: number) =>
      i18n.translate('xpack.observability.alertsTable.showingAlertsTitle', {
        values: { totalAlerts },
        defaultMessage: '{totalAlerts, plural, =1 {alert} other {alerts}}',
      }),
    viewRuleDetailsButtonText: i18n.translate(
      'xpack.observability.alertsTable.viewRuleDetailsButtonText',
      {
        defaultMessage: 'View rule details',
      }
    ),
    viewAlertDetailsButtonText: i18n.translate(
      'xpack.observability.alertsTable.viewAlertDetailsButtonText',
      {
        defaultMessage: 'View alert details',
      }
    ),
  },
  alertsFlyout: {
    statusLabel: i18n.translate('xpack.observability.alertsFlyout.statusLabel', {
      defaultMessage: 'Status',
    }),
    lastUpdatedLabel: i18n.translate('xpack.observability.alertsFlyout.lastUpdatedLabel', {
      defaultMessage: 'Last updated',
    }),
    durationLabel: i18n.translate('xpack.observability.alertsFlyout.durationLabel', {
      defaultMessage: 'Duration',
    }),
    expectedValueLabel: i18n.translate('xpack.observability.alertsFlyout.expectedValueLabel', {
      defaultMessage: 'Expected value',
    }),
    actualValueLabel: i18n.translate('xpack.observability.alertsFlyout.actualValueLabel', {
      defaultMessage: 'Actual value',
    }),
    ruleTypeLabel: i18n.translate('xpack.observability.alertsFlyout.ruleTypeLabel', {
      defaultMessage: 'Rule type',
    }),
    reasonTitle: i18n.translate('xpack.observability.alertsFlyout.reasonTitle', {
      defaultMessage: 'Reason',
    }),
    viewRulesDetailsLinkText: i18n.translate(
      'xpack.observability.alertsFlyout.viewRulesDetailsLinkText',
      {
        defaultMessage: 'View rule details',
      }
    ),
    documentSummaryTitle: i18n.translate('xpack.observability.alertsFlyout.documentSummaryTitle', {
      defaultMessage: 'Document Summary',
    }),
    viewInAppButtonText: i18n.translate('xpack.observability.alertsFlyout.viewInAppButtonText', {
      defaultMessage: 'View in app',
    }),
  },
  alertsSearchBar: {
    placeholder: i18n.translate('xpack.observability.alerts.searchBarPlaceholder', {
      defaultMessage: 'Search alerts (e.g. kibana.alert.evaluation.threshold > 75)',
    }),
  },
};
