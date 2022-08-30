/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { textAnalysisSettings } from './text_analysis';

describe('textAnalysisSettings lib function', () => {
  it('supports a default language', async () => {
    expect(textAnalysisSettings()).toEqual({
      analysis: {
        analyzer: {
          i_prefix: {
            filter: ['cjk_width', 'lowercase', 'asciifolding', 'front_ngram'],
            tokenizer: 'standard',
            type: 'custom',
          },
          i_text_bigram: {
            filter: [
              'cjk_width',
              'lowercase',
              'asciifolding',
              'en-stem-filter',
              'bigram_joiner',
              'bigram_max_size',
            ],
            tokenizer: 'standard',
            type: 'custom',
          },
          iq_text_base: {
            filter: ['cjk_width', 'lowercase', 'asciifolding', 'en-stop-words-filter'],
            tokenizer: 'standard',
            type: 'custom',
          },
          iq_text_delimiter: {
            filter: [
              'delimiter',
              'cjk_width',
              'lowercase',
              'asciifolding',
              'en-stop-words-filter',
              'en-stem-filter',
            ],
            tokenizer: 'whitespace',
            type: 'custom',
          },
          iq_text_stem: {
            filter: [
              'cjk_width',
              'lowercase',
              'asciifolding',
              'en-stop-words-filter',
              'en-stem-filter',
            ],
            tokenizer: 'standard',
            type: 'custom',
          },
          q_prefix: {
            filter: ['cjk_width', 'lowercase', 'asciifolding'],
            tokenizer: 'standard',
            type: 'custom',
          },
          q_text_bigram: {
            filter: [
              'cjk_width',
              'lowercase',
              'asciifolding',
              'en-stem-filter',
              'bigram_joiner_unigrams',
              'bigram_max_size',
            ],
            tokenizer: 'standard',
            type: 'custom',
          },
        },
        filter: {
          bigram_joiner: {
            max_shingle_size: 2,
            output_unigrams: false,
            token_separator: '',
            type: 'shingle',
          },
          bigram_joiner_unigrams: {
            max_shingle_size: 2,
            output_unigrams: true,
            token_separator: '',
            type: 'shingle',
          },
          bigram_max_size: {
            max: 16,
            min: 0,
            type: 'length',
          },
          delimiter: {
            catenate_all: true,
            catenate_numbers: true,
            catenate_words: true,
            generate_number_parts: true,
            generate_word_parts: true,
            preserve_original: false,
            split_on_case_change: true,
            split_on_numerics: true,
            stem_english_possessive: true,
            type: 'word_delimiter_graph',
          },
          'en-stem-filter': {
            name: 'light_english',
            language: 'light_english',
            type: 'stemmer',
          },
          'en-stop-words-filter': {
            stopwords: '_english_',
            type: 'stop',
          },
          front_ngram: {
            max_gram: 12,
            min_gram: 1,
            type: 'edge_ngram',
          },
        },
      },
    });
  });

  it('returns settings for another language', async () => {
    expect(textAnalysisSettings('fr')).toEqual({
      analysis: {
        analyzer: {
          i_prefix: {
            filter: ['cjk_width', 'lowercase', 'asciifolding', 'front_ngram'],
            tokenizer: 'standard',
            type: 'custom',
          },
          i_text_bigram: {
            filter: [
              'cjk_width',
              'lowercase',
              'asciifolding',
              'fr-stem-filter',
              'bigram_joiner',
              'bigram_max_size',
            ],
            tokenizer: 'standard',
            type: 'custom',
          },
          iq_text_base: {
            filter: ['cjk_width', 'lowercase', 'asciifolding', 'fr-stop-words-filter'],
            tokenizer: 'standard',
            type: 'custom',
          },
          iq_text_delimiter: {
            filter: [
              'fr-elision',
              'delimiter',
              'cjk_width',
              'lowercase',
              'asciifolding',
              'fr-stop-words-filter',
              'fr-stem-filter',
            ],
            tokenizer: 'whitespace',
            type: 'custom',
          },
          iq_text_stem: {
            filter: [
              'fr-elision',
              'cjk_width',
              'lowercase',
              'asciifolding',
              'fr-stop-words-filter',
              'fr-stem-filter',
            ],
            tokenizer: 'standard',
            type: 'custom',
          },
          q_prefix: {
            filter: ['cjk_width', 'lowercase', 'asciifolding'],
            tokenizer: 'standard',
            type: 'custom',
          },
          q_text_bigram: {
            filter: [
              'cjk_width',
              'lowercase',
              'asciifolding',
              'fr-stem-filter',
              'bigram_joiner_unigrams',
              'bigram_max_size',
            ],
            tokenizer: 'standard',
            type: 'custom',
          },
        },
        filter: {
          bigram_joiner: {
            max_shingle_size: 2,
            output_unigrams: false,
            token_separator: '',
            type: 'shingle',
          },
          bigram_joiner_unigrams: {
            max_shingle_size: 2,
            output_unigrams: true,
            token_separator: '',
            type: 'shingle',
          },
          bigram_max_size: {
            max: 16,
            min: 0,
            type: 'length',
          },
          delimiter: {
            catenate_all: true,
            catenate_numbers: true,
            catenate_words: true,
            generate_number_parts: true,
            generate_word_parts: true,
            preserve_original: false,
            split_on_case_change: true,
            split_on_numerics: true,
            stem_english_possessive: true,
            type: 'word_delimiter_graph',
          },
          'fr-elision': {
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
            type: 'elision',
          },
          'fr-stem-filter': {
            name: 'light_french',
            language: 'light_french',
            type: 'stemmer',
          },
          'fr-stop-words-filter': {
            stopwords: '_french_',
            type: 'stop',
          },
          front_ngram: {
            max_gram: 12,
            min_gram: 1,
            type: 'edge_ngram',
          },
        },
      },
    });
  });
});
