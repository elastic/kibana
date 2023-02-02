/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ConfigKey } from '../runtime_types';
import { paramReplaceFormatter } from './formatting_utils';

describe('formattingUtils', () => {
  it('paramReplaceFormatter replaces params', () => {
    const result = paramReplaceFormatter(
      { urls: '${homePageUrl}', params: JSON.stringify({ homePageUrl: 'https://elastic.co' }) },
      ConfigKey.URLS
    );

    expect(result).toEqual('https://elastic.co');
  });

  it('paramReplaceFormatter returns same value in case no param', () => {
    const result = paramReplaceFormatter(
      { urls: '${homePageUrl}', params: JSON.stringify({ homePageUrl1: 'https://elastic.co' }) },
      ConfigKey.URLS
    );

    expect(result).toEqual('');
  });
});
