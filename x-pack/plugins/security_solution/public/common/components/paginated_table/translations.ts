/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SHOWING = i18n.translate('xpack.securitySolution.paginatedTable.showingSubtitle', {
  defaultMessage: 'Showing',
});

export const ROWS = i18n.translate('xpack.securitySolution.paginatedTable.rowsButtonLabel', {
  defaultMessage: 'Rows per page',
});

export const TOAST_TITLE = i18n.translate(
  'xpack.securitySolution.paginatedTable.tooManyResultsToastTitle',
  {
    defaultMessage: ' - too many results',
  }
);

export const TOAST_TEXT = i18n.translate(
  'xpack.securitySolution.paginatedTable.tooManyResultsToastText',
  {
    defaultMessage: 'Narrow your query to better filter the results',
  }
);
