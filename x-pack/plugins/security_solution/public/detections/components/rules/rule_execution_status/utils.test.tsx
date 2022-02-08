/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStatusColor } from './utils';

describe('Rule execution status utils', () => {
  describe('getStatusColor', () => {
    it('returns "subdued" if null was provided', () => {
      expect(getStatusColor(null)).toBe('subdued');
    });
  });
});
