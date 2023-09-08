/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloseAlertParamsSchema, CreateAlertParamsSchema } from './schema';
import {
  OpsgenieCloseAlertExample,
  OpsgenieCreateAlertExample,
  ValidCreateAlertSchema,
} from './test_schema';

describe('opsgenie schema', () => {
  describe('CreateAlertParamsSchema', () => {
    it.each([
      ['ValidCreateAlertSchema', ValidCreateAlertSchema],
      ['OpsgenieCreateAlertExample', OpsgenieCreateAlertExample],
    ])('validates the test object [%s] correctly', (objectName, testObject) => {
      expect(() => CreateAlertParamsSchema.validate(testObject)).not.toThrow();
    });
  });

  describe('CloseAlertParamsSchema', () => {
    it.each([['OpsgenieCloseAlertExample', OpsgenieCloseAlertExample]])(
      'validates the test object [%s] correctly',
      (objectName, testObject) => {
        expect(() => CloseAlertParamsSchema.validate(testObject)).not.toThrow();
      }
    );
  });
});
