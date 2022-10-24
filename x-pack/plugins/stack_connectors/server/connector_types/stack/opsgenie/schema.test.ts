/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateAlertParamsSchema } from './schema';
import { ValidCreateAlertSchema } from './test_schema';

describe('opsgenie schema', () => {
  describe('CreateAlertParamsSchema', () => {
    it('validates the test object correctly', () => {
      expect(() => CreateAlertParamsSchema.validate(ValidCreateAlertSchema)).not.toThrow();
    });
  });
});
