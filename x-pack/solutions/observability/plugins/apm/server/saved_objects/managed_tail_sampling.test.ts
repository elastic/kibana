/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  managedTailSampling,
  managedTailSamplingCreateSchema,
  managedTailSamplingForwardCompatibilitySchema,
} from './managed_tail_sampling';

const validAttributes = {
  enabled: true,
  policiesJson: JSON.stringify([{ name: 'keep-errors', type: 'status_code' }]),
  policiesHash: 'abc123',
};

describe('managedTailSampling saved object type', () => {
  it('is one hidden document for the whole project', () => {
    expect(managedTailSampling.name).toBe('managed-tail-sampling');
    expect(managedTailSampling.hidden).toBe(true);
    expect(managedTailSampling.namespaceType).toBe('agnostic');
  });

  it('does not map any attribute', () => {
    expect(managedTailSampling.mappings).toEqual({ dynamic: false, properties: {} });
  });

  describe('create schema', () => {
    it('accepts a valid document with and without updatedBy', () => {
      expect(() => managedTailSamplingCreateSchema.validate(validAttributes)).not.toThrow();
      expect(() =>
        managedTailSamplingCreateSchema.validate({ ...validAttributes, updatedBy: 'elastic' })
      ).not.toThrow();
    });

    it.each(['enabled', 'policiesJson', 'policiesHash'])('rejects a missing %s', (key) => {
      const { [key]: _removed, ...rest } = validAttributes as Record<string, unknown>;
      expect(() => managedTailSamplingCreateSchema.validate(rest)).toThrow();
    });

    it('rejects unknown keys', () => {
      expect(() =>
        managedTailSamplingCreateSchema.validate({ ...validAttributes, extra: 1 })
      ).toThrow();
    });
  });

  describe('forwardCompatibility schema', () => {
    it('drops unknown keys written by a newer Kibana instead of throwing', () => {
      expect(
        managedTailSamplingForwardCompatibilitySchema.validate({
          ...validAttributes,
          fromNewerVersion: 'x',
        })
      ).toEqual(validAttributes);
    });
  });
});
