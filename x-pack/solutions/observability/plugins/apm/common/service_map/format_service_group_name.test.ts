/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatServiceGroupName } from './format_service_group_name';

describe('formatServiceGroupName', () => {
  it('names a saved group, an attribute group and a calls group after what they hold', () => {
    expect(
      formatServiceGroupName({ id: 'savedGroups:abc', kind: 'savedGroup', name: 'Shop' })
    ).toBe('Shop');
    expect(
      formatServiceGroupName({
        id: 'service.namespace:shop',
        kind: 'attribute',
        attribute: 'service.namespace',
        value: 'shop',
      })
    ).toBe('shop');
    expect(
      formatServiceGroupName({ id: 'calls:cart', kind: 'calls', busiestService: 'checkout' })
    ).toBe('checkout');
  });

  it('gives the group of services with no value a label for every attribute', () => {
    const attributes = ['service.namespace', 'kubernetes.namespace', 'namePrefix'] as const;

    for (const attribute of attributes) {
      // `\S` matches any character that isn't whitespace, so the label can't be empty or blank.
      // The wording itself is product copy and free to change.
      expect(formatServiceGroupName({ id: 'noValue', kind: 'noValue', attribute })).toMatch(/\S/);
    }
  });
});
