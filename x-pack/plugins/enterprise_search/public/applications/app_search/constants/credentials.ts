/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ADMIN = 'admin';
export const PRIVATE = 'private';
export const SEARCH = 'search';

export const TOKEN_TYPE_DESCRIPTION = {
  [SEARCH]: 'Public Search Keys are used for search endpoints only.',
  [PRIVATE]: 'Private API Keys are used for read and/or write access on one or more Engines.',
  [ADMIN]: 'Private Admin Keys are used to interact with the Credentials API.',
};

export const TOKEN_TYPE_DISPLAY_NAMES = {
  [SEARCH]: 'Public Search Key',
  [PRIVATE]: 'Private API Key',
  [ADMIN]: 'Private Admin Key',
};

export const TOKEN_TYPE_INFO = [
  { value: SEARCH, text: TOKEN_TYPE_DISPLAY_NAMES[SEARCH] },
  { value: PRIVATE, text: TOKEN_TYPE_DISPLAY_NAMES[PRIVATE] },
  { value: ADMIN, text: TOKEN_TYPE_DISPLAY_NAMES[ADMIN] },
];
