/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReadConsoleRequestSchema } from './schema';

describe('ReadConsoleRequestSchema', () => {
  it('should throw error', () => {
    expect(() => ReadConsoleRequestSchema.params.validate({ console_id: '123' })).toThrow();
  });

  it.each([['enable_host_risk_score', 'enable_user_risk_score']])(
    'should allow console_id %p',
    async (template) => {
      expect(ReadConsoleRequestSchema.params.validate({ console_id: template })).toEqual({
        console_id: template,
      });
    }
  );
});
