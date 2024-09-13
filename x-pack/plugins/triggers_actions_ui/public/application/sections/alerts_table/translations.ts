/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
export { CASES, MAINTENANCE_WINDOWS } from '../translations';

export const ALERTS_TABLE_CONF_ERROR_TITLE = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.configuration.errorTitle',
  {
    defaultMessage: 'Unable to load alerts table',
  }
);

export const ALERTS_TABLE_CONF_ERROR_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.configuration.errorBody',
  {
    defaultMessage:
      'There was an error loading the alerts table. This table is missing the necessary configuration. Please contact your administrator for help',
  }
);

export const ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.column.actions',
  {
    defaultMessage: 'Actions',
  }
);

export const ALERTS_TABLE_TITLE = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.title',
  {
    defaultMessage: 'Alerts table',
  }
);

export const ALERTS_TABLE_FILTERS_ERROR_TITLE = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.filters.errorTitle',
  {
    defaultMessage: 'Unsupported alerts filters set',
  }
);

export const ALERTS_TABLE_UNKNOWN_ERROR_TITLE = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.unknownErrorTitle',
  {
    defaultMessage: 'Cannot display alerts',
  }
);

export const ALERTS_TABLE_UNKNOWN_ERROR_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.unknownErrorBody',
  {
    defaultMessage: 'An error occurred while rendering the alerts table',
  }
);

export const ALERTS_TABLE_UNKNOWN_ERROR_COPY_TO_CLIPBOARD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.unknownErrorCopyToClipboardLabel',
  {
    defaultMessage: 'Copy error to clipboard',
  }
);
