/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const I18LABELS = {
  filterByUrl: i18n.translate('xpack.observability.filters.filterByUrl', {
    defaultMessage: 'Filter by URL',
  }),
  getSearchResultsLabel: (total: number) =>
    i18n.translate('xpack.observability.filters.searchResults', {
      defaultMessage: '{total} Search results',
      values: { total },
    }),
  topPages: i18n.translate('xpack.observability.filters.topPages', {
    defaultMessage: 'Top pages',
  }),
  select: i18n.translate('xpack.observability.filters.select', {
    defaultMessage: 'Select',
  }),
  url: i18n.translate('xpack.observability.filters.url', {
    defaultMessage: 'Url',
  }),
  loadingResults: i18n.translate('xpack.observability.filters.url.loadingResults', {
    defaultMessage: 'Loading results',
  }),
  noResults: i18n.translate('xpack.observability.filters.url.noResults', {
    defaultMessage: 'No results available',
  }),
};
