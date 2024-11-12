/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseObservableRt } from './v1';

describe('CaseObservableRt', () => {
  it('has expected attributes in request', () => {
    const observable = {
      description: undefined,
      id: undefined,
      typeKey: 'ef528526-2af9-4345-9b78-046512c5bbd6',
      value: 'email@example.com',
      createdAt: '2024-10-01',
      updatedAt: '2024-10-01',
    };

    const query = CaseObservableRt.decode(observable);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: observable,
    });
  });
});
