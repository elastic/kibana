/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

// This is the value used for an engine that has no explicit 'language' set, it works
// with all languages.
export const UNIVERSAL_LANGUAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.universalLanguage',
  {
    defaultMessage: 'Universal',
  }
);
