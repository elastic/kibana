/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getStatusColor } from './helpers';

describe('rule_status helpers', () => {
  it('getStatusColor returns subdued if null was provided', () => {
    expect(getStatusColor(null)).toBe('subdued');
  });
});
