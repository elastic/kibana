/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupServicesByAttribute } from './group_services_by_attribute';

const namespaces: Record<string, string | undefined> = {
  auth: 'platform',
  cart: 'shop',
  checkout: 'shop',
  'legacy-batch': undefined,
  ledger: 'payments',
  orphan: '',
  payment: 'payments',
};
const services = Object.keys(namespaces);
const valueOfService = (service: string) => namespaces[service];

describe('groupServicesByAttribute', () => {
  it('puts services sharing a value in one group, listed in the order their first service appears', () => {
    const grouping = groupServicesByAttribute({
      source: 'service.namespace',
      services,
      valueOfService,
    });

    expect(grouping).toEqual({
      source: 'service.namespace',
      groups: [
        {
          id: 'service.namespace:platform',
          kind: 'attribute',
          attribute: 'service.namespace',
          value: 'platform',
        },
        {
          id: 'service.namespace:shop',
          kind: 'attribute',
          attribute: 'service.namespace',
          value: 'shop',
        },
        { id: 'noAttribute', kind: 'noAttribute', attribute: 'service.namespace' },
        {
          id: 'service.namespace:payments',
          kind: 'attribute',
          attribute: 'service.namespace',
          value: 'payments',
        },
      ],
      // auth, cart, checkout, legacy-batch, ledger, orphan, payment
      assignment: [0, 1, 1, 2, 3, 2, 3],
    });
  });

  it('puts every service with no value or an empty one in a single group', () => {
    const { groups, assignment } = groupServicesByAttribute({
      source: 'service.namespace',
      services: ['a', 'b', 'c'],
      valueOfService: (service) => (service === 'b' ? '' : undefined),
    });

    expect(groups).toEqual([
      { id: 'noAttribute', kind: 'noAttribute', attribute: 'service.namespace' },
    ]);
    expect(assignment).toEqual([0, 0, 0]);
  });

  it('keeps the id unique when a value looks like a special group id', () => {
    const { groups } = groupServicesByAttribute({
      source: 'service.namespace',
      services: ['a', 'b'],
      valueOfService: (service) => (service === 'a' ? 'noAttribute' : undefined),
    });

    expect(groups.map(({ id }) => id)).toEqual(['service.namespace:noAttribute', 'noAttribute']);
  });

  it('gives the same groups for the same input', () => {
    const first = groupServicesByAttribute({
      source: 'service.namespace',
      services,
      valueOfService,
    });
    const second = groupServicesByAttribute({
      source: 'service.namespace',
      services,
      valueOfService,
    });

    expect(second).toEqual(first);
  });
});
