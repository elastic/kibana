/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { AUTHENTICATION_DOCS_URL } from '../../routes';

export const CREDENTIALS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.credentials.title',
  { defaultMessage: 'Credentials' }
);

export enum ApiTokenTypes {
  Admin = 'admin',
  Private = 'private',
  Search = 'search',
}

export const CREATE_MESSAGE = (name: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.tokens.created', {
    defaultMessage: "API key '{name}' was created",
    values: { name },
  });
export const UPDATE_MESSAGE = (name: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.tokens.update', {
    defaultMessage: "API key '{name}' was updated",
    values: { name },
  });
export const DELETE_MESSAGE = (name: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.tokens.deleted', {
    defaultMessage: "API key '{name}' was deleted",
    values: { name },
  });

export const SEARCH_DISPLAY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.tokens.permissions.display.search',
  {
    defaultMessage: 'search',
  }
);
export const ALL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.tokens.permissions.display.all',
  {
    defaultMessage: 'all',
  }
);
export const READ_WRITE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.tokens.permissions.display.readwrite',
  {
    defaultMessage: 'read/write',
  }
);
export const READ_ONLY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.tokens.permissions.display.readonly',
  {
    defaultMessage: 'read-only',
  }
);
export const WRITE_ONLY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.tokens.permissions.display.writeonly',
  {
    defaultMessage: 'write-only',
  }
);

export const TOKEN_TYPE_DESCRIPTION: { [key: string]: string } = {
  [ApiTokenTypes.Search]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.tokens.search.description',
    {
      defaultMessage: 'Public Search Keys are used for search endpoints only.',
    }
  ),
  [ApiTokenTypes.Private]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.tokens.private.description',
    {
      defaultMessage:
        'Private API Keys are used for read and/or write access on one or more Engines.',
    }
  ),
  [ApiTokenTypes.Admin]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.tokens.admin.description',
    {
      defaultMessage: 'Private Admin Keys are used to interact with the Credentials API.',
    }
  ),
};

export const TOKEN_TYPE_DISPLAY_NAMES: { [key: string]: string } = {
  [ApiTokenTypes.Search]: i18n.translate('xpack.enterpriseSearch.appSearch.tokens.search.name', {
    defaultMessage: 'Public Search Key',
  }),
  [ApiTokenTypes.Private]: i18n.translate('xpack.enterpriseSearch.appSearch.tokens.private.name', {
    defaultMessage: 'Private API Key',
  }),
  [ApiTokenTypes.Admin]: i18n.translate('xpack.enterpriseSearch.appSearch.tokens.admin.name', {
    defaultMessage: 'Private Admin Key',
  }),
};

export const TOKEN_TYPE_INFO = [
  { value: ApiTokenTypes.Search, text: TOKEN_TYPE_DISPLAY_NAMES[ApiTokenTypes.Search] },
  { value: ApiTokenTypes.Private, text: TOKEN_TYPE_DISPLAY_NAMES[ApiTokenTypes.Private] },
  { value: ApiTokenTypes.Admin, text: TOKEN_TYPE_DISPLAY_NAMES[ApiTokenTypes.Admin] },
];

export const FLYOUT_ARIA_LABEL_ID = 'credentialsFlyoutTitle';

export const DOCS_HREF = AUTHENTICATION_DOCS_URL;
