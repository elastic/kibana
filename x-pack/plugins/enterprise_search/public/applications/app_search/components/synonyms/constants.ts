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
export const SYNONYM_CREATE_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.synonyms.createSynonymSetTitle',
  { defaultMessage: 'Add a synonym set' }
);
export const SYNONYM_UPDATE_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.synonyms.updateSynonymSetTitle',
  { defaultMessage: 'Manage synonym set' }
);

export const CREATE_SUCCESS = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.synonyms.createSuccessMessage',
  { defaultMessage: 'Synonym set created' }
);
export const UPDATE_SUCCESS = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.synonyms.updateSuccessMessage',
  { defaultMessage: 'Synonym set updated' }
);
export const DELETE_CONFIRMATION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.synonyms.deleteConfirmationMessage',
  { defaultMessage: 'Are you sure you want to delete this synonym set?' }
);
export const DELETE_SUCCESS = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.synonyms.deleteSuccessMessage',
  { defaultMessage: 'Synonym set deleted' }
);
export const SYNONYM_IMPACT_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.synonyms.impactDescription',
  { defaultMessage: 'The set will impact your results shortly.' }
);
