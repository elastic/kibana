/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.errorTitle',
  {
    defaultMessage: 'Unable to display document information',
  }
);

export const ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.errorMessage',
  { defaultMessage: 'There was an error displaying the document fields and values' }
);
