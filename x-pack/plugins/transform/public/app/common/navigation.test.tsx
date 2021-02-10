/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDiscoverUrl } from './navigation';

describe('navigation', () => {
  test('getDiscoverUrl should provide encoded url to Discover page', () => {
    expect(getDiscoverUrl('farequote-airline', 'http://example.com')).toBe(
      'http://example.com/app/discover#?_g=()&_a=(index:farequote-airline)'
    );
  });
});
