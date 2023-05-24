/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../../common/doc_links';
import { LanguageDefinition, Languages } from './types';

export const curlDefinition: LanguageDefinition = {
  buildSearchQuery: `TBD`,
  configureClient: `TBD`,
  docLink: docLinks.apiIntro,
  iconType: 'cURL.svg',
  id: Languages.CURL,
  ingestData: `TBD`,
  installClient: `TBD`,
  name: i18n.translate('xpack.serverlessSearch.languages.cURL', {
    defaultMessage: 'cURL',
  }),
  languageStyling: 'shell',
  testConnection: `TBD`,
};
