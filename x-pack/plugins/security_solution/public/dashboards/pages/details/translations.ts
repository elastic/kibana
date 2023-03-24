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

export const RESTORE_URL_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.restoreUrlErrorTitle',
  {
    defaultMessage: `Error restoring state from URL`,
  }
);

export const SAVE_STATE_IN_URL_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.saveStateInUrlErrorTitle',
  {
    defaultMessage: `Error saving state in URL`,
  }
);

export const EDIT_DASHBOARD_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.editDashboardButtonTitle',
  {
    defaultMessage: `Edit`,
  }
);
