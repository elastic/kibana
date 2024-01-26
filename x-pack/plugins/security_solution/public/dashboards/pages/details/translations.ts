/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const DASHBOARD_NO_READ_PERMISSION_TITLE = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.viewPorpmpt.noReadPermission.title',
  {
    defaultMessage: 'You have no permission to read the dashboard',
  }
);

export const DASHBOARD_NO_READ_PERMISSION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.viewPorpmpt.noReadPermission.description',
  {
    defaultMessage: 'Contact your administrator for help.',
  }
);

export const DASHBOARD_INDICES_NOT_FOUND_TITLE = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.viewPorpmpt.indicesNotFound.title',
  {
    defaultMessage: 'Indices not found',
  }
);

export const DASHBOARD_NOT_FOUND_TITLE = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.notFound.title',
  {
    defaultMessage: 'Not found',
  }
);

export const EDIT_DASHBOARD_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.editDashboardButtonTitle',
  {
    defaultMessage: `Edit`,
  }
);

export const EDIT_DASHBOARD_TITLE = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.editDashboardTitle',
  {
    defaultMessage: `Editing new dashboard`,
  }
);

export const VIEW_DASHBOARD_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.viewDashboardButtonTitle',
  {
    defaultMessage: `Switch to view mode`,
  }
);

export const SAVE_DASHBOARD_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.saveDashboardButtonTitle',
  {
    defaultMessage: `Save`,
  }
);
