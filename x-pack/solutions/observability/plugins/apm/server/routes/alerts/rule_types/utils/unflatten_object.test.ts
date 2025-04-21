/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unflattenObject } from './unflatten_object';

describe('unflatten group-by fields', () => {
  it('returns unflattened group-by fields', () => {
    const groupByFields = {
      'service.name': 'foo',
      'service.environment': 'env-foo',
      'transaction.type': 'tx-type-foo',
      'transaction.name': 'tx-name-foo',
    };

    const unflattenedGroupByFields = unflattenObject(groupByFields);

    expect(unflattenedGroupByFields).toEqual({
      service: { environment: 'env-foo', name: 'foo' },
      transaction: { name: 'tx-name-foo', type: 'tx-type-foo' },
    });
  });
});
