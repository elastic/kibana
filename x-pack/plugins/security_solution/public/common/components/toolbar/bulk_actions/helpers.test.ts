/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInitialTagsState } from './helpers';

const defaultTags = ['test 1', 'test 2', 'test 3'];

describe('createInitialTagsState', () => {
  it('should return default tags if no existing tags are provided ', () => {
    const initialState = createInitialTagsState([], defaultTags);
    expect(initialState).toMatchInlineSnapshot(`
      Array [
        Object {
          "checked": undefined,
          "label": "test 1",
        },
        Object {
          "checked": undefined,
          "label": "test 2",
        },
        Object {
          "checked": undefined,
          "label": "test 3",
        },
      ]
    `);
  });
});
