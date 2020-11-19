/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpaceActions } from './space';

const version = '1.0.0-zeta1';

describe(`#manage`, () => {
  test('returns `space:${version}:manage`', () => {
    const spaceActions = new SpaceActions(version);
    expect(spaceActions.manage).toBe('space:1.0.0-zeta1:manage');
  });
});
