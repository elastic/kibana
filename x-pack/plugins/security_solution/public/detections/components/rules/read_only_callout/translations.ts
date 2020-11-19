/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const READ_ONLY_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.readOnlyCallOutTitle',
  {
    defaultMessage: 'Rule permissions required',
  }
);

export const READ_ONLY_CALLOUT_MSG = i18n.translate(
  'xpack.securitySolution.detectionEngine.readOnlyCallOutMsg',
  {
    defaultMessage:
      'You are currently missing the required permissions to create/edit detection engine rule. Please contact your administrator for further assistance.',
  }
);

export const DISMISS_CALLOUT = i18n.translate(
  'xpack.securitySolution.detectionEngine.dismissButton',
  {
    defaultMessage: 'Dismiss',
  }
);
