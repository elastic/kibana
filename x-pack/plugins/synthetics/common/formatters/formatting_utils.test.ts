/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ConfigKey } from '../runtime_types';
import { replaceStringWithParams } from './formatting_utils';

describe('formattingUtils', () => {
  it('replaceStringWithParams replaces params', () => {
    const result = replaceStringWithParams(
      { urls: '${homePageUrl}', params: JSON.stringify({ homePageUrl: 'https://elastic.co' }) },
      ConfigKey.URLS
    );

    expect(result).toEqual('https://elastic.co');
  });

  it('replaceStringWithParams returns same value in case no param', () => {
    const result = replaceStringWithParams(
      { urls: '${homePageUrl}', params: JSON.stringify({ homePageUrl1: 'https://elastic.co' }) },
      ConfigKey.URLS
    );

    expect(result).toEqual('');
  });
});
