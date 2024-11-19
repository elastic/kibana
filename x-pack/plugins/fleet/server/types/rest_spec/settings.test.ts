/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PutSpaceSettingsRequestSchema } from './settings';

describe('PutSpaceSettingsRequestSchema', () => {
  it('should work with valid allowed_namespace_prefixes', () => {
    PutSpaceSettingsRequestSchema.body.validate({
      allowed_namespace_prefixes: ['test', 'test2'],
    });
  });

  it('should not accept allowed_namespace_prefixes with -', () => {
    expect(() =>
      PutSpaceSettingsRequestSchema.body.validate({
        allowed_namespace_prefixes: ['test', 'test-'],
      })
    ).toThrowErrorMatchingInlineSnapshot(`"[allowed_namespace_prefixes.1]: Must not contain -"`);
  });
});
