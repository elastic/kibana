/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValueForSelectedField } from './get_value_for_selected_field';

describe('getValueForSelectedField', () => {
  test('should return for simple key', () => {
    const hit = {
      _index: 'sample-index',
      _id: '8jSNY48B6iHEi98DL1C-',
      _score: 0.7789394,
      _source: {
        test: 'The Shawshank Redemption',
        metadata: {
          source:
            'Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion',
        },
      },
    };

    expect(getValueForSelectedField(hit._source, 'test')).toEqual('The Shawshank Redemption');
  });

  test('should return for combined key', () => {
    const hit = {
      _index: 'sample-index',
      _id: '8jSNY48B6iHEi98DL1C-',
      _score: 0.7789394,
      _source: {
        test: 'The Shawshank Redemption',
        metadata: {
          source:
            'Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion',
        },
      },
    };

    expect(getValueForSelectedField(hit._source, 'metadata.source')).toEqual(
      'Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion'
    );
  });

  test('should return undefined for missing key', () => {
    const hit = {
      _index: 'sample-index',
      _id: '8jSNY48B6iHEi98DL1C-',
      _score: 0.7789394,
      _source: {
        test: 'The Shawshank Redemption',
        metadata: {
          source:
            'Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion',
        },
      },
    };

    expect(getValueForSelectedField(hit._source, 'metadata.sources')).toBeUndefined();
  });
});
