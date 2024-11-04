/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AddObservableRequestRt } from './v1';

describe('ObservableRequestRT', () => {
  it('has expected attributes in request', () => {
    const defaultRequest = {
      version: '8ae7a250',
      observables: [
        {
          description: undefined,
          id: undefined,
          typeKey: 'ef528526-2af9-4345-9b78-046512c5bbd6',
          value: 'email@example.com',
          isIoc: false,
          hasBeenSighted: false,
          createdAt: '2024-10-03 12:56',
          updatedAt: '2024-10-03 12:56',
        },
      ],
    };

    const query = AddObservableRequestRt.decode(defaultRequest);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });
});
