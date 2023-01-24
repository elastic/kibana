/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_FETCH_ALERTS = i18n.translate(
  'xpack.triggersActionsUI.components.alertTable.useFetchAlerts.errorMessageText',
  {
    defaultMessage: `An error has occurred on alerts search`,
  }
);

export const ERROR_FETCH_BROWSER_FIELDS = i18n.translate(
  'xpack.triggersActionsUI.components.alertTable.useFetchBrowserFieldsCapabilities.errorMessageText',
  {
    defaultMessage: 'An error has occurred loading browser fields',
  }
);
