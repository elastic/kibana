/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface languageDataEntry {
  name: string;
  stemmer: string;
  stop_words: string;
  custom_filter_definitions?: object;
  prepended_filters?: string[];
  postpended_filters?: string[];
}

const LanguageData: Record<string, languageDataEntry> = {
  da: {
    name: 'Danish',
    stemmer: 'danish',
    stop_words: '_danish_',
  },
  de: {
    name: 'German',
    stemmer: 'light_german',
    stop_words: '_german_',
  },
  en: {
    name: 'English',
    stemmer: 'light_english',
    stop_words: '_english_',
  },
  es: {
    name: 'Spanish',
    stemmer: 'light_spanish',
    stop_words: '_spanish_',
  },
  fr: {
    name: 'French',
    stemmer: 'light_french',
    stop_words: '_french_',
    custom_filter_definitions: {
      'fr-elision': {
        type: 'elision',
        articles: [
          'l',
          'm',
          't',
          'qu',
          'n',
          's',
          'j',
          'd',
          'c',
          'jusqu',
          'quoiqu',
          'lorsqu',
          'puisqu',
        ],
        articles_case: true,
      },
    },
    prepended_filters: ['fr-elision'],
  },
  it: {
    name: 'Italian',
    stemmer: 'light_italian',
    stop_words: '_italian_',
    custom_filter_definitions: {
      'it-elision': {
        type: 'elision',
        articles: [
          'c',
          'l',
          'all',
          'dall',
          'dell',
          'nell',
          'sull',
          'coll',
          'pell',
          'gl',
          'agl',
          'dagl',
          'degl',
          'negl',
          'sugl',
          'un',
          'm',
          't',
          's',
          'v',
          'd',
        ],
        articles_case: true,
      },
    },
    prepended_filters: ['it-elision'],
  },
  ja: {
    name: 'Japanese',
    stemmer: 'light_english',
    stop_words: '_english_',
    postpended_filters: ['cjk_bigram'],
  },
  ko: {
    name: 'Korean',
    stemmer: 'light_english',
    stop_words: '_english_',
    postpended_filters: ['cjk_bigram'],
  },
  nl: {
    name: 'Dutch',
    stemmer: 'dutch',
    stop_words: '_dutch_',
  },
  pt: {
    name: 'Portuguese',
    stemmer: 'light_portuguese',
    stop_words: '_portuguese_',
  },
  'pt-br': {
    name: 'Portuguese (Brazil)',
    stemmer: 'brazilian',
    stop_words: '_brazilian_',
  },
  ru: {
    name: 'Russian',
    stemmer: 'russian',
    stop_words: '_russian_',
  },
  th: {
    name: 'Thai',
    stemmer: 'light_english',
    stop_words: '_thai_',
  },
  zh: {
    name: 'Chinese',
    stemmer: 'light_english',
    stop_words: '_english_',
    postpended_filters: ['cjk_bigram'],
  },
};

const FRONT_NGRAM_MAX_GRAM = 12;

const edgeEndgramType = 'edge_ngram' as 'edge_ngram';
const wordDelimiterGraphType = 'word_delimiter_graph' as 'word_delimiter_graph';
const shingleType = 'shingle' as 'shingle';
const lengthType = 'length' as 'length';

const GenericFilters = {
  front_ngram: {
    type: edgeEndgramType,
    min_gram: 1,
    max_gram: FRONT_NGRAM_MAX_GRAM,
  },
  delimiter: {
    type: wordDelimiterGraphType,
    generate_word_parts: true,
    generate_number_parts: true,
    catenate_words: true,
    catenate_numbers: true,
    catenate_all: true,
    preserve_original: false,
    split_on_case_change: true,
    split_on_numerics: true,
    stem_english_possessive: true,
  },
  bigram_joiner: {
    type: shingleType,
    token_separator: '',
    max_shingle_size: 2,
    output_unigrams: false,
  },
  bigram_joiner_unigrams: {
    type: shingleType,
    token_separator: '',
    max_shingle_size: 2,
    output_unigrams: true,
  },
  bigram_max_size: {
    type: lengthType,
    min: 0,
    max: 16,
  },
};

export const textAnalysisSettings = (language: string = 'en') => {
  return {
    analysis: {
      analyzer: analyzerDefinitions(language),
      filter: filterDefinitions(language),
    },
  };
};

const stemFilterName = (languageCode: string) => {
  return `${languageCode}-stem-filter`;
};

const stopWordsFilterName = (languageCode: string) => {
  return `${languageCode}-stop-words-filter`;
};

const analyzerDefinitions = (language: string) => {
  const prependedFilters = LanguageData[language].prepended_filters || [];
  const postpendedFilters = LanguageData[language].postpended_filters || [];
  const customType = 'custom' as 'custom';

  return {
    i_prefix: {
      type: customType,
      tokenizer: 'standard',
      filter: ['cjk_width', 'lowercase', 'asciifolding', 'front_ngram'],
    },
    q_prefix: {
      type: customType,
      tokenizer: 'standard',
      filter: ['cjk_width', 'lowercase', 'asciifolding'],
    },
    iq_text_base: {
      type: customType,
      tokenizer: 'standard',
      filter: ['cjk_width', 'lowercase', 'asciifolding', stopWordsFilterName(language)],
    },
    iq_text_stem: {
      type: customType,
      tokenizer: 'standard',
      filter: [
        ...prependedFilters,
        'cjk_width',
        'lowercase',
        'asciifolding',
        stopWordsFilterName(language),
        stemFilterName(language),
        ...postpendedFilters,
      ],
    },
    iq_text_delimiter: {
      type: customType,
      tokenizer: 'whitespace',
      filter: [
        ...prependedFilters,
        'delimiter',
        'cjk_width',
        'lowercase',
        'asciifolding',
        stopWordsFilterName(language),
        stemFilterName(language),
        ...postpendedFilters,
      ],
    },
    i_text_bigram: {
      type: customType,
      tokenizer: 'standard',
      filter: [
        'cjk_width',
        'lowercase',
        'asciifolding',
        stemFilterName(language),
        'bigram_joiner',
        'bigram_max_size',
      ],
    },
    q_text_bigram: {
      type: customType,
      tokenizer: 'standard',
      filter: [
        'cjk_width',
        'lowercase',
        'asciifolding',
        stemFilterName(language),
        'bigram_joiner_unigrams',
        'bigram_max_size',
      ],
    },
  };
};

const filterDefinitions = (language: string) => {
  const stemmerName = LanguageData[language].stemmer;
  const stopWordsName = LanguageData[language].stop_words;
  const customFilterDefinitions = LanguageData[language].custom_filter_definitions || {};

  return {
    ...GenericFilters,
    [stemFilterName(language)]: {
      type: 'stemmer',
      name: stemmerName,
    },
    [stopWordsFilterName(language)]: {
      type: 'stop',
      stopwords: stopWordsName,
    },
    ...customFilterDefinitions,
  };
};
