/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpaceActions } from './space';

describe(`#manage`, () => {
  test(`returns space:manage`, () => {
    const spaceActions = new SpaceActions();
    expect(spaceActions.manage).toBe('space:manage');
  });
});
