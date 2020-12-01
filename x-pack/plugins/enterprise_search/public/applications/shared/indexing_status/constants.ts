/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const INDEXING_STATUS_PROGRESS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.indexingStatus.progress.title',
  {
    defaultMessage: 'Indexing progress',
  }
);

export const INDEXING_STATUS_HAS_ERRORS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.indexingStatus.hasErrors.title',
  {
    defaultMessage: 'Several documents have field conversion errors.',
  }
);

export const INDEXING_STATUS_HAS_ERRORS_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.indexingStatus.hasErrors.button',
  {
    defaultMessage: 'View errors',
  }
);
