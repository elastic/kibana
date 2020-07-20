/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SHOWING_ALERTS = (totalAlertsFormatted: string, totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.alerts.utilityBar.showingAlertsTitle', {
    values: { totalAlertsFormatted, totalAlerts },
    defaultMessage:
      'Showing {totalAlertsFormatted} {totalAlerts, plural, =1 {alert} other {alerts}}',
  });

export const SELECTED_ALERTS = (selectedAlertsFormatted: string, selectedAlerts: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.alerts.utilityBar.selectedAlertsTitle', {
    values: { selectedAlertsFormatted, selectedAlerts },
    defaultMessage:
      'Selected {selectedAlertsFormatted} {selectedAlerts, plural, =1 {alert} other {alerts}}',
  });

export const SELECT_ALL_ALERTS = (totalAlertsFormatted: string, totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.alerts.utilityBar.selectAllAlertsTitle', {
    values: { totalAlertsFormatted, totalAlerts },
    defaultMessage:
      'Select all {totalAlertsFormatted} {totalAlerts, plural, =1 {alert} other {alerts}}',
  });

export const ADDITIONAL_FILTERS_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.additionalFiltersTitle',
  {
    defaultMessage: 'Additional filters',
  }
);

export const ADDITIONAL_FILTERS_ACTIONS_SHOW_BUILDING_BLOCK = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.additionalFiltersActions.showBuildingBlockTitle',
  {
    defaultMessage: 'Include building block alerts',
  }
);

export const CLEAR_SELECTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.clearSelectionTitle',
  {
    defaultMessage: 'Clear selection',
  }
);

export const TAKE_ACTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.takeActionTitle',
  {
    defaultMessage: 'Take action',
  }
);

export const BATCH_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.batchActionsTitle',
  {
    defaultMessage: 'Batch actions',
  }
);

export const BATCH_ACTION_VIEW_SELECTED_IN_HOSTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.batchActions.viewSelectedInHostsTitle',
  {
    defaultMessage: 'View selected in hosts',
  }
);

export const BATCH_ACTION_VIEW_SELECTED_IN_NETWORK = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.batchActions.viewSelectedInNetworkTitle',
  {
    defaultMessage: 'View selected in network',
  }
);

export const BATCH_ACTION_VIEW_SELECTED_IN_TIMELINE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.batchActions.viewSelectedInTimelineTitle',
  {
    defaultMessage: 'View selected in timeline',
  }
);

export const BATCH_ACTION_OPEN_SELECTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.batchActions.openSelectedTitle',
  {
    defaultMessage: 'Open selected',
  }
);

export const BATCH_ACTION_CLOSE_SELECTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.batchActions.closeSelectedTitle',
  {
    defaultMessage: 'Close selected',
  }
);

export const BATCH_ACTION_IN_PROGRESS_SELECTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.batchActions.inProgressSelectedTitle',
  {
    defaultMessage: 'Mark in progress',
  }
);
