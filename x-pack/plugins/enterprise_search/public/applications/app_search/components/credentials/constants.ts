/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const ADMIN = 'admin';
export const PRIVATE = 'private';
export const SEARCH = 'search';

export const TOKEN_TYPE_DESCRIPTION = {
  [SEARCH]: i18n.translate('xpack.enterpriseSearch.appSearch.tokens.search.description', {
    defaultMessage: 'Public Search Keys are used for search endpoints only.',
  }),
  [PRIVATE]: i18n.translate('xpack.enterpriseSearch.appSearch.tokens.private.description', {
    defaultMessage:
      'Private API Keys are used for read and/or write access on one or more Engines.',
  }),
  [ADMIN]: i18n.translate('xpack.enterpriseSearch.appSearch.tokens.admin.description', {
    defaultMessage: 'Private Admin Keys are used to interact with the Credentials API.',
  }),
};

export const TOKEN_TYPE_DISPLAY_NAMES = {
  [SEARCH]: i18n.translate('xpack.enterpriseSearch.appSearch.tokens.search.name', {
    defaultMessage: 'Public Search Key',
  }),
  [PRIVATE]: i18n.translate('xpack.enterpriseSearch.appSearch.tokens.private.name', {
    defaultMessage: 'Private API Key',
  }),
  [ADMIN]: i18n.translate('xpack.enterpriseSearch.appSearch.tokens.admin.name', {
    defaultMessage: 'Private Admin Key',
  }),
};

export const TOKEN_TYPE_INFO = [
  { value: SEARCH, text: TOKEN_TYPE_DISPLAY_NAMES[SEARCH] },
  { value: PRIVATE, text: TOKEN_TYPE_DISPLAY_NAMES[PRIVATE] },
  { value: ADMIN, text: TOKEN_TYPE_DISPLAY_NAMES[ADMIN] },
];
