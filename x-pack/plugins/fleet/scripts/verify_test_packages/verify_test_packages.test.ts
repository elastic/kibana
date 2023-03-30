/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { verifyAllTestPackages } from './verify_test_packages';

describe('Test packages', () => {
  test('All test packages should be valid (node scripts/verify_test_packages) ', async () => {
    const { errors } = await verifyAllTestPackages();
    expect(errors).toEqual([]);
  });
});
