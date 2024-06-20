/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPackage } from './build_integration';

import type { Integration } from '../../common';

import { testIntegration } from '../../__jest__/fixtures/build_integration';

let testLocalIntegraiton: Integration = testIntegration;

describe('Testing categorization invalid category', () => {
  it('buildPackage()', async () => {
    const response = buildPackage(testLocalIntegraiton);
    expect(response).toBeInstanceOf(Promise<Buffer>);
  });
});
