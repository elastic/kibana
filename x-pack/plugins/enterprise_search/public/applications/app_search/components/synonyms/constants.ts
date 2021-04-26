/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DEFAULT_META } from '../../../shared/constants';

export const SYNONYMS_PAGE_META = {
  page: {
    ...DEFAULT_META.page,
    size: 12, // Use a multiple of 3, since synonym cards are in rows of 3
  },
};

export const SYNONYMS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.synonyms.title',
  { defaultMessage: 'Synonyms' }
);
