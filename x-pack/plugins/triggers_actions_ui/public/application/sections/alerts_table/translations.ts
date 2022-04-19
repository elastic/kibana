/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const ALERTS_TABLE_CONF_ERROR_TITLE = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.configuration.errorTitle',
  {
    defaultMessage: 'Unable to load alerts table',
  }
);

export const ALERTS_TABLE_CONF_ERROR_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.configuration.errorTitle',
  {
    defaultMessage:
      'There was an error loading the alerts table. This table is missing the necessary configuration. Please contact your administrator for help',
  }
);
