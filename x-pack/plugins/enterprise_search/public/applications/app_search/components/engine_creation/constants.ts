/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DEFAULT_LANGUAGE = 'Universal';

export const ENGINE_CREATION_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.title',
  {
    defaultMessage: 'Create an engine',
  }
);

export const ENGINE_CREATION_FORM_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.form.title',
  {
    defaultMessage: 'Configure your search engine',
  }
);

export const ENGINE_CREATION_FORM_ENGINE_NAME_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.form.engineName.label',
  {
    defaultMessage: 'Engine name',
  }
);

export const ALLOWED_CHARS_NOTE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.form.engineName.allowedCharactersHelpText',
  {
    defaultMessage: 'Engine names can only contain lowercase letters, numbers, and hyphens',
  }
);

export const SANITIZED_NAME_NOTE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.form.engineName.sanitizedNameHelpText',
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
    defaultMessage: 'Engine language',
  }
);

export const ENGINE_CREATION_FORM_SUBMIT_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineCreation.form.submitButton.buttonLabel',
  {
    defaultMessage: 'Create engine',
  }
);

export const ENGINE_CREATION_SUCCESS_MESSAGE = (name: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.engineCreation.successMessage', {
    defaultMessage: "Engine ''{name}'' was created",
    values: { name },
  });

export const SUPPORTED_LANGUAGES = [
  {
    value: 'Universal',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.universalDropDownOptionLabel',
      {
        defaultMessage: 'Universal',
      }
    ),
  },
  {
    text: '—',
    disabled: true,
  },
  {
    value: 'zh',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.chineseDropDownOptionLabel',
      {
        defaultMessage: 'Chinese',
      }
    ),
  },
  {
    value: 'da',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.danishDropDownOptionLabel',
      {
        defaultMessage: 'Danish',
      }
    ),
  },
  {
    value: 'nl',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.dutchDropDownOptionLabel',
      {
        defaultMessage: 'Dutch',
      }
    ),
  },
  {
    value: 'en',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.englishDropDownOptionLabel',
      {
        defaultMessage: 'English',
      }
    ),
  },
  {
    value: 'fr',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.frenchDropDownOptionLabel',
      {
        defaultMessage: 'French',
      }
    ),
  },
  {
    value: 'de',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.germanDropDownOptionLabel',
      {
        defaultMessage: 'German',
      }
    ),
  },
  {
    value: 'it',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.italianDropDownOptionLabel',
      {
        defaultMessage: 'Italian',
      }
    ),
  },
  {
    value: 'ja',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.japaneseDropDownOptionLabel',
      {
        defaultMessage: 'Japanese',
      }
    ),
  },
  {
    value: 'ko',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.koreanDropDownOptionLabel',
      {
        defaultMessage: 'Korean',
      }
    ),
  },
  {
    value: 'pt',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.portugueseDropDownOptionLabel',
      {
        defaultMessage: 'Portuguese',
      }
    ),
  },
  {
    value: 'pt-br',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.portugueseBrazilDropDownOptionLabel',
      {
        defaultMessage: 'Portuguese (Brazil)',
      }
    ),
  },
  {
    value: 'ru',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.russianDropDownOptionLabel',
      {
        defaultMessage: 'Russian',
      }
    ),
  },
  {
    value: 'es',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.spanishDropDownOptionLabel',
      {
        defaultMessage: 'Spanish',
      }
    ),
  },
  {
    value: 'th',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engineCreation.supportedLanguages.thaiDropDownOptionLabel',
      {
        defaultMessage: 'Thai',
      }
    ),
  },
];
