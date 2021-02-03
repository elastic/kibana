/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ENGINE_CREATION_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.title',
  {
    defaultMessage: 'Create an Engine',
  }
);

export const ENGINE_CREATION_FORM_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.form.title',
  {
    defaultMessage: 'Name your Engine',
  }
);

export const ENGINE_CREATION_FORM_ENGINE_NAME_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.form.engineName.label',
  {
    defaultMessage: 'Engine Name',
  }
);

export const ALLOWED_CHARS_NOTE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.form.engineName.allowedCharactersNote',
  {
    defaultMessage: 'Engine names can only contain lowercase letters, numbers, and hyphens',
  }
);

export const SANITIZED_NAME_NOTE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.form.engineName.sanitizedNameNote',
  {
    defaultMessage: 'Your engine will be named',
  }
);

export const ENGINE_CREATION_FORM_ENGINE_NAME_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.form.engineName.placeholder',
  {
    defaultMessage: 'i.e., my-search-engine',
  }
);

export const ENGINE_CREATION_FORM_ENGINE_LANGUAGE_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.form.engineLanguage.label',
  {
    defaultMessage: 'Engine Language',
  }
);

export const ENGINE_CREATION_FORM_SUBMIT_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.form.submitButton.label',
  {
    defaultMessage: 'Create Engine',
  }
);

export const ENGINE_CREATION_SUCCESS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.successMessage',
  {
    defaultMessage: 'Successfully created engine.',
  }
);

export const SUPPORTED_LANGUAGES = [
  {
    value: 'Universal',
    text: 'Universal',
  },
  {
    text: '—',
    disabled: true,
  },
  {
    value: 'zh',
    text: 'Chinese',
  },
  {
    value: 'da',
    text: 'Danish',
  },
  {
    value: 'nl',
    text: 'Dutch',
  },
  {
    value: 'en',
    text: 'English',
  },
  {
    value: 'fr',
    text: 'French',
  },
  {
    value: 'de',
    text: 'German',
  },
  {
    value: 'it',
    text: 'Italian',
  },
  {
    value: 'ja',
    text: 'Japanese',
  },
  {
    value: 'ko',
    text: 'Korean',
  },
  {
    value: 'pt',
    text: 'Portuguese',
  },
  {
    value: 'pt-br',
    text: 'Portuguese (Brazil)',
  },
  {
    value: 'ru',
    text: 'Russian',
  },
  {
    value: 'es',
    text: 'Spanish',
  },
  {
    value: 'th',
    text: 'Thai',
  },
];
