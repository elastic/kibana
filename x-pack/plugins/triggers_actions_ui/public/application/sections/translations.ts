/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASES = i18n.translate('xpack.triggersActionsUI.cases.label', {
  defaultMessage: 'Cases',
});

export const MAINTENANCE_WINDOWS = i18n.translate(
  'xpack.triggersActionsUI.maintenanceWindows.label',
  {
    defaultMessage: 'Maintenance Windows',
  }
);

export const OBSERVABILITY_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.observability',
  {
    defaultMessage: 'Observability',
  }
);

export const SECURITY_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.security',
  {
    defaultMessage: 'Security',
  }
);

export const STACK_MANAGEMENT_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.stackManagement',
  {
    defaultMessage: 'Stack management',
  }
);

export const STACK_MONITORING_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.stackMonitoring',
  {
    defaultMessage: 'Stack monitoring',
  }
);

export const UPTIME_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.uptime',
  {
    defaultMessage: 'Uptime',
  }
);

export const APM_DISPLAY_NAME = i18n.translate('xpack.triggersActionsUI.sections.alertsTable.apm', {
  defaultMessage: 'APM',
});

export const INFRASTRUCTURE_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.infrastructure',
  {
    defaultMessage: 'Infrastructure',
  }
);

export const SLO_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.slos',
  {
    defaultMessage: 'SLOs',
  }
);

export const LOGS_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.logs',
  {
    defaultMessage: 'Logs',
  }
);

export const ML_DISPLAY_NAME = i18n.translate('xpack.triggersActionsUI.sections.alertsTable.ml', {
  defaultMessage: 'Machine Learning',
});

export const FEATURE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.globalAlerts.quickFilters.feature',
  {
    defaultMessage: 'Feature',
  }
);

export const TECH_PREVIEW_LABEL = i18n.translate(
  'xpack.triggersActionsUI.technicalPreviewBadgeLabel',
  {
    defaultMessage: 'Technical preview',
  }
);

export const TECH_PREVIEW_DESCRIPTION = i18n.translate(
  'xpack.triggersActionsUI.technicalPreviewBadgeDescription',
  {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  }
);

const SHOW_REQUEST_MODAL_EDIT = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.subheadingTitleEdit',
  {
    defaultMessage: 'edit',
  }
);

const SHOW_REQUEST_MODAL_CREATE = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.subheadingTitleCreate',
  {
    defaultMessage: 'create',
  }
);

export const SHOW_REQUEST_MODAL_SUBTITLE = (edit: boolean) =>
  i18n.translate('xpack.triggersActionsUI.sections.showRequestModal.subheadingTitle', {
    defaultMessage: 'This Kibana request will {requestType} this rule.',
    values: { requestType: edit ? SHOW_REQUEST_MODAL_EDIT : SHOW_REQUEST_MODAL_CREATE },
  });

const SHOW_REQUEST_MODAL_TITLE_EDIT = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.headerTitleEdit',
  {
    defaultMessage: 'Edit',
  }
);

const SHOW_REQUEST_MODAL_TITLE_CREATE = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.headerTitleCreate',
  {
    defaultMessage: 'Create',
  }
);

export const SHOW_REQUEST_MODAL_TITLE = (edit: boolean) =>
  i18n.translate('xpack.triggersActionsUI.sections.showRequestModal.headerTitle', {
    defaultMessage: '{requestType} alerting rule request',
    values: {
      requestType: edit ? SHOW_REQUEST_MODAL_TITLE_EDIT : SHOW_REQUEST_MODAL_TITLE_CREATE,
    },
  });

export const SHOW_REQUEST_MODAL_ERROR = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.somethingWentWrongDescription',
  {
    defaultMessage: 'Sorry about that, something went wrong.',
  }
);
