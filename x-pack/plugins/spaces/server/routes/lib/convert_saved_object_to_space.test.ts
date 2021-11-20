/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertSavedObjectToSpace } from './convert_saved_object_to_space';

describe('convertSavedObjectToSpace', () => {
  it('converts a saved object representation to a Space object', () => {
    const savedObject = {
      id: 'foo',
      attributes: {
        name: 'Foo Space',
        description: 'no fighting',
        _reserved: false,
      },
    };

    expect(convertSavedObjectToSpace(savedObject)).toEqual({
      id: 'foo',
      name: 'Foo Space',
      description: 'no fighting',
      _reserved: false,
    });
  });
});
