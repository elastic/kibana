/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSupportedField,
  validateServiceGroupKuery,
  SERVICE_GROUP_SUPPORTED_FIELDS,
} from './service_groups';
import {
  TRANSACTION_TYPE,
  TRANSACTION_DURATION,
  SERVICE_FRAMEWORK_VERSION,
} from './es_fields/apm';

describe('service_groups common utils', () => {
  describe('isSupportedField', () => {
    it('should allow supported fields', () => {
      SERVICE_GROUP_SUPPORTED_FIELDS.map((field) => {
        expect(isSupportedField(field)).toBe(true);
      });
    });
    it('should reject unsupported fields', () => {
      const unsupportedFields = [
        TRANSACTION_TYPE,
        TRANSACTION_DURATION,
        SERVICE_FRAMEWORK_VERSION,
      ];
      unsupportedFields.map((field) => {
        expect(isSupportedField(field)).toBe(false);
      });
    });
  });
  describe('validateServiceGroupKuery', () => {
    it('should validate supported KQL filter for a service group', () => {
      const result = validateServiceGroupKuery(
        `service.name: testbeans* or agent.name: "nodejs"`
      );
      expect(result).toHaveProperty('isValidFields', true);
      expect(result).toHaveProperty('isValidSyntax', true);
      expect(result).not.toHaveProperty('message');
    });
    it('should return validation error when unsupported fields are used', () => {
      const result = validateServiceGroupKuery(
        `service.name: testbeans* or agent.name: "nodejs" or transaction.type: request`
      );
      expect(result).toHaveProperty('isValidFields', false);
      expect(result).toHaveProperty('isValidSyntax', true);
      expect(result).toHaveProperty(
        'message',
        'Query filter for service group does not support fields [transaction.type]'
      );
    });
    it('should return parsing error when KQL is incomplete', () => {
      const result = validateServiceGroupKuery(
        `service.name: testbeans* or agent.name: "nod`
      );
      expect(result).toHaveProperty('isValidFields', false);
      expect(result).toHaveProperty('isValidSyntax', false);
      expect(result).toHaveProperty('message');
      expect(result).not.toBe('');
    });
  });
});
