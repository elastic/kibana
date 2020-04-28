/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const STATUS_CODE = i18n.translate(
  'xpack.siem.components.ml.api.errors.statusCodeFailureTitle',
  {
    defaultMessage: 'Status Code:',
  }
);

export const NETWORK_ERROR = i18n.translate(
  'xpack.siem.components.ml.api.errors.networkErrorFailureTitle',
  {
    defaultMessage: 'Network Error:',
  }
);

export const INDEX_PATTERN_FETCH_FAILURE = i18n.translate(
  'xpack.siem.components.mlPopup.hooks.errors.indexPatternFetchFailureTitle',
  {
    defaultMessage: 'Index pattern fetch failure',
  }
);
