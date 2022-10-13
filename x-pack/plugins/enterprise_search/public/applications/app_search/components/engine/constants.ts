/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POLLING_DURATION = 5000;

export const POLLING_ERROR_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.pollingErrorMessage',
  { defaultMessage: 'Could not fetch engine data' }
);

export const POLLING_ERROR_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.pollingErrorDescription',
  { defaultMessage: 'Please check your connection or manually reload the page.' }
);
