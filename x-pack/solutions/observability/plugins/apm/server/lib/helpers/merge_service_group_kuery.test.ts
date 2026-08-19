/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineServiceGroupKueries } from './merge_service_group_kuery';

describe('combineServiceGroupKueries', () => {
  it('returns empty string when there are no service groups', () => {
    expect(combineServiceGroupKueries([])).toBe('');
  });

  it('returns empty string when all service groups have empty kueries', () => {
    expect(combineServiceGroupKueries([{ kuery: '' }, { kuery: '' }])).toBe('');
  });

  it('returns single kuery wrapped in parens when only one group has a kuery', () => {
    expect(combineServiceGroupKueries([{ kuery: 'service.name: foo' }, { kuery: '' }])).toBe(
      '(service.name: foo)'
    );
  });

  it('joins multiple non-empty kueries with OR', () => {
    expect(
      combineServiceGroupKueries([
        { kuery: 'service.name: foo' },
        { kuery: 'labels.env: production' },
      ])
    ).toBe('(service.name: foo) OR (labels.env: production)');
  });
});
