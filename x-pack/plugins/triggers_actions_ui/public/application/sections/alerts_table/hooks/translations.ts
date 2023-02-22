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

export const ADD_TO_EXISTING_CASE = i18n.translate(
  'xpack.triggersActionsUI.alerts.table.actions.addToCase',
  {
    defaultMessage: 'Add to existing case',
  }
);

export const ADD_TO_NEW_CASE = i18n.translate(
  'xpack.triggersActionsUI.alerts.table.actions.addToNewCase',
  {
    defaultMessage: 'Add to new case',
  }
);

export const ADD_TO_CASE_DISABLED = i18n.translate(
  'xpack.triggersActionsUI.alerts.table.actions.addToCaseDisabled',
  {
    defaultMessage: 'Add to case is not supported for this selection',
  }
);
