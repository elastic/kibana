/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface TranslationsMock {
  [title: string]: string;
}

export const createI18nLoaderMock = (translations: TranslationsMock) => {
  return {
    getTranslationsByLocale() {
      return {
        messages: translations,
      };
    },
  };
};
