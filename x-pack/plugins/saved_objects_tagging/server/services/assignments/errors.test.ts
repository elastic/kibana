/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssignmentError } from './errors';

describe('AssignmentError', () => {
  it('is assignable to its instances', () => {
    // this test is here to ensure that the `Object.setPrototypeOf` constructor workaround for TS is not removed.
    const error = new AssignmentError('message', 403);

    expect(error instanceof AssignmentError).toBe(true);
  });
});
