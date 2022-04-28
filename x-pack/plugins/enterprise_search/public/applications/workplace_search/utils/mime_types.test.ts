/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mimeType } from '.';

describe('mimeType', () => {
  it('should return correct mimeType when present', () => {
    expect(mimeType('Image/gif')).toEqual('GIF');
  });

  it('should fall back gracefully when mimeType not present', () => {
    expect(mimeType('NOPE')).toEqual('NOPE');
  });
});
