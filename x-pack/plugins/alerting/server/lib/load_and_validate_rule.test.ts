/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadAndValidateRule } from './load_and_validate_rule';

describe('loadAndValidateRule()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns expected outputs if rule is successfully loaded and parameters validated', async () => {});

  test('throws expected error when decryption fails', async () => {});

  test('throws expected error when rule is disabled', async () => {});

  test('throws expected error when we cannot get rule using rules client', async () => {});

  test('throws expected error when rule type is disabled', async () => {});

  test('throws expected error when rule params are invalid', async () => {});
});
