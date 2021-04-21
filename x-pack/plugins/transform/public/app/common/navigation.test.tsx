/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDiscoverUrl, getDiscoverUrlState } from './navigation';

describe('navigation: getDiscoverUrl', () => {
  test('getDiscoverUrl should provide encoded url to Discover page', () => {
    expect(getDiscoverUrl('farequote-airline', 'http://example.com')).toBe(
      'http://example.com/app/discover#?_g=()&_a=(index:farequote-airline)'
    );
  });
});

describe('navigation: getDiscoverUrlState', () => {
  test('getDiscoverUrlState should provide encoded url state without an index for Discover page', () => {
    expect(getDiscoverUrlState()).toBe('_g=()&_a=()');
  });
  test('getDiscoverUrlState should provide encoded url state with an index for Discover page', () => {
    expect(getDiscoverUrlState('farequote-airline')).toBe('_g=()&_a=(index:farequote-airline)');
  });
});
