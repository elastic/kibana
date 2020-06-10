/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { missingImage } from '../../common/lib/missing_asset';
import { isValidUrl } from './url';

describe('resolve_dataurl', () => {
  it('returns valid dataurl', () => {
    expect(isValidUrl(missingImage)).toBe(true);
  });
  it('returns valid http url', () => {
    const httpurl = 'https://test.com/s/';
    expect(isValidUrl(httpurl)).toBe(true);
  });
  it('returns false for invalid url', () => {
    expect(isValidUrl('test')).toBe(false);
  });
});
