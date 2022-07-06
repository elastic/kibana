/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface languageDataEntry{
  name: string,
  stemmer: string,
  stop_words: string,
  custom_filter_definitions?: object,
  prepended_filters?: string[],
  postpended_filters?: string[],
}

const LanguageData:Record<string, languageDataEntry> = {
  da: {
    name: 'Danish',
    stemmer: 'danish',
    stop_words: '_danish_'
  },
  de: {
    name: 'German',
    stemmer: 'light_german',
    stop_words: '_german_'
  },
  en: {
    name: 'English',
    stemmer: 'light_english',
    stop_words: '_english_'
  },
  es: {
    name: 'Spanish',
    stemmer: 'light_spanish',
    stop_words: '_spanish_'
  },
  fr: {
    name: 'French',
    stemmer: 'light_french',
    stop_words: '_french_',
    custom_filter_definitions: {
      'fr-elision': {
        type: 'elision',
        articles: ['l', 'm', 't', 'qu', 'n', 's', 'j', 'd', 'c', 'jusqu', 'quoiqu', 'lorsqu', 'puisqu'],
        articles_case: true
      }
    },
    prepended_filters: [
      'fr-elision'
    ]
  },
  it: {
    name: 'Italian',
    stemmer: 'light_italian',
    stop_words: '_italian_',
    custom_filter_definitions: {
      'it-elision': {
        'type': 'elision',
        'articles': ['c', 'l', 'all', 'dall', 'dell', 'nell', 'sull', 'coll', 'pell', 'gl', 'agl', 'dagl', 'degl', 'negl', 'sugl', 'un', 'm', 't', 's', 'v', 'd'],
        'articles_case': true
      }
    },
    prepended_filters: [
      'it-elision'
    ]
  },
  ja: {
    name: 'Japanese',
    stemmer: 'light_english',
    stop_words: '_english_',
    postpended_filters: [
      'cjk_bigram'
    ]
  },
  ko: {
    name: 'Korean',
    stemmer: 'light_english',
    stop_words: '_english_',
    postpended_filters: [
      'cjk_bigram'
    ]
  },
  nl: {
    name: 'Dutch',
    stemmer: 'dutch',
    stop_words: '_dutch_'
  },
  pt: {
    name: 'Portuguese',
    stemmer: 'light_portuguese',
    stop_words: '_portuguese_'
  },
  'pt-br': {
    name: 'Portuguese (Brazil)',
    stemmer: 'brazilian',
    stop_words: '_brazilian_'
  },
  ru: {
    name: 'Russian',
    stemmer: 'russian',
    stop_words: '_russian_'
  },
  th: {
    name: 'Thai',
    stemmer: 'light_english',
    stop_words: '_thai_'
  },
  zh: {
    name: 'Chinese',
    stemmer: 'light_english',
    stop_words: '_english_',
    postpended_filters: [
      'cjk_bigram'
    ]
  }
}

const FRONT_NGRAM_MAX_GRAM = 12;

const GenericFilters = {
   front_ngram: {
    type: 'edge_ngram',
    min_gram: 1,
    max_gram: FRONT_NGRAM_MAX_GRAM
  },
  delimiter: {
    type: 'word_delimiter_graph',
    generate_word_parts: true,
    generate_number_parts: true,
    catenate_words: true,
    catenate_numbers: true,
    catenate_all: true,
    preserve_original: false,
    split_on_case_change: true,
    split_on_numerics: true,
    stem_english_possessive: true
  },
  bigram_joiner: {
    type: 'shingle',
    token_separator: '',
    max_shingle_size: 2,
    output_unigrams: false
  },
  bigram_joiner_unigrams: {
    type: 'shingle',
    token_separator: '',
    max_shingle_size: 2,
    output_unigrams: true
  },
  bigram_max_size: {
    type: 'length',
    min: 0,
    max: 16
  }
}

export const textAnalysisSettings = async (language: string) => {
  return {
    analysis: {
      analyzer: analyzerDefinitions(language),
      filter: filterDefinitions(language),
    },
    index: {
      similarity: {
        default: {
          type: 'BM25'
        }
      }
    }
  }
};

const stemFilterName = (languageCode: string) => {
  return `${languageCode}-stem-filter`;
}

const stopWordsFilterName = (languageCode: string) => {
  return `${languageCode}-stop-words-filter`;
}

const analyzerDefinitions = (language: string) => {
  return {
    /*

    definitions['i_prefix'] = {
      :tokenizer => smart_tokenizer_name,
      :filter => [
        *folding_filters,
        'front_ngram'
      ]
    }

    definitions['q_prefix'] = {
      :tokenizer => smart_tokenizer_name,
      :filter => [
        *folding_filters
      ]
    }

    definitions['iq_text_base'] = {
      :tokenizer => smart_tokenizer_name,
      :filter => [
        *folding_filters,
        stop_words_filter_name
      ]
    }

    definitions['iq_text_stem'] = {
      :tokenizer => smart_tokenizer_name,
      :filter => [
        *prepended_filters,
        *folding_filters,
        stop_words_filter_name,
        stem_filter_name,
        *postpended_filters
      ]
    }

    definitions['iq_text_delimiter'] = {
      :tokenizer => 'whitespace',
      :filter => [
        *prepended_filters,
        'delimiter',
        *folding_filters,
        stop_words_filter_name,
        stem_filter_name,
        *postpended_filters
      ]
    }

    definitions['i_text_bigram'] = {
      :tokenizer => smart_tokenizer_name,
      :filter => [
        *folding_filters,
        stem_filter_name,
        'bigram_joiner',
        'bigram_max_size'
      ]
    }

    definitions['q_text_bigram'] = {
      :tokenizer => smart_tokenizer_name,
      :filter => [
        *folding_filters,
        stem_filter_name,
        'bigram_joiner_unigrams',
        'bigram_max_size'
      ]
    }
    */
  }
};

const filterDefinitions = (language: string) => {
  const stemmerName = LanguageData[language]['stemmer'];
  const stopWordsName = LanguageData[language]['stop_words'];
  const customFilterDefinitions = LanguageData[language]['custom_filter_definitions'] || {};

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
  }
};