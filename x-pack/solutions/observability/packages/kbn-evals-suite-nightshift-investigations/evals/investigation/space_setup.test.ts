/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSandboxAllowlist } from '@kbn/nightshift-investigations-plugin/common';
import { EVAL_SANDBOX_HOST_ALLOWLIST } from './space_setup';

describe('EVAL_SANDBOX_HOST_ALLOWLIST', () => {
  it('passes the sandbox allowlist validation unchanged', () => {
    expect(validateSandboxAllowlist([...EVAL_SANDBOX_HOST_ALLOWLIST])).toEqual({
      hosts: [...EVAL_SANDBOX_HOST_ALLOWLIST],
      errors: [],
    });
  });
});
