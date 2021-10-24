/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TEST_SAVED_OBJECT } from '../../common/constants';
import { getTestSavedObject } from './test_saved_object';

describe('getTestSavedObject', () => {
  it('return test saved object', () => {
    const savedObject = getTestSavedObject();

    expect(savedObject.name).toBe(TEST_SAVED_OBJECT);
  });
});
