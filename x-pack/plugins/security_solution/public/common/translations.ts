/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EMPTY_TITLE = i18n.translate('xpack.securitySolution.pages.common.emptyTitle', {
  defaultMessage: 'Welcome to Security Solution. Let’s get you started.',
});

export const EMPTY_ACTION_PRIMARY = i18n.translate(
  'xpack.securitySolution.pages.common.emptyActionPrimary',
  {
    defaultMessage: 'Add data with Beats',
  }
);

export const EMPTY_ACTION_SECONDARY = i18n.translate(
  'xpack.securitySolution.pages.common.emptyActionSecondary',
  {
    defaultMessage: 'getting started guide.',
  }
);

export const EMPTY_ACTION_ENDPOINT = i18n.translate(
  'xpack.securitySolution.pages.common.emptyActionEndpoint',
  {
    defaultMessage: 'Add data with Elastic Agent (Beta)',
  }
);
