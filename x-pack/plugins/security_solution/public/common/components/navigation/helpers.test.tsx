/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchNavTab } from './types';
import { getSearch } from './helpers';

describe('helpers', () => {
  it('returns the search string', () => {
    const searchNavTab: SearchNavTab = { urlKey: 'host', isDetailPage: false };
    const globalQueryString = 'test=123';

    expect(getSearch(searchNavTab, globalQueryString)).toEqual('?test=123');
  });

  it('returns an empty string when globalQueryString is empty', () => {
    const searchNavTab: SearchNavTab = { urlKey: 'host', isDetailPage: false };
    const globalQueryString = '';

    expect(getSearch(searchNavTab, globalQueryString)).toEqual('');
  });
});
