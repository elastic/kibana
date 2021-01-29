/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_ALL_ACTIONS = i18n.translate('xpack.osquery.actions.errorSearchDescription', {
  defaultMessage: `An error has occurred on all actions search`,
});

export const FAIL_ALL_ACTIONS = i18n.translate('xpack.osquery.actions.failSearchDescription', {
  defaultMessage: `Failed to fetch actions`,
});

export const ERROR_ACTION_DETAILS = i18n.translate(
  'xpack.osquery.actionDetails.errorSearchDescription',
  {
    defaultMessage: `An error has occurred on action details search`,
  }
);

export const FAIL_ACTION_DETAILS = i18n.translate(
  'xpack.osquery.actionDetails.failSearchDescription',
  {
    defaultMessage: `Failed to fetch action details`,
  }
);

export const ERROR_ACTION_RESULTS = i18n.translate(
  'xpack.osquery.actionResults.errorSearchDescription',
  {
    defaultMessage: `An error has occurred on action results search`,
  }
);

export const FAIL_ACTION_RESULTS = i18n.translate(
  'xpack.osquery.actionResults.failSearchDescription',
  {
    defaultMessage: `Failed to fetch action results`,
  }
);
