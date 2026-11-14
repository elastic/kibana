/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  tailSampling,
  tailSamplingCreateSchema,
  tailSamplingForwardCompatibilitySchema,
} from './tail_sampling';

const validAttributes = {
  enabled: true,
  processor: 'tail_sampling',
  configJson: JSON.stringify({ policies: [{ name: 'keep-errors', type: 'status_code' }] }),
  configHash: 'abc123',
};

describe('tailSampling saved object type', () => {
  it('is one hidden document for the whole project', () => {
    expect(tailSampling.name).toBe('tail-sampling');
    expect(tailSampling.hidden).toBe(true);
    expect(tailSampling.namespaceType).toBe('agnostic');
  });

  it('does not map any attribute', () => {
    expect(tailSampling.mappings).toEqual({ dynamic: false, properties: {} });
  });

  describe('create schema', () => {
    it('accepts a valid document with and without updatedBy', () => {
      expect(() => tailSamplingCreateSchema.validate(validAttributes)).not.toThrow();
      expect(() =>
        tailSamplingCreateSchema.validate({ ...validAttributes, updatedBy: 'elastic' })
      ).not.toThrow();
    });

    it.each(['enabled', 'processor', 'configJson', 'configHash'])(
      'rejects a missing %s',
      (key) => {
        const { [key]: _removed, ...rest } = validAttributes as Record<string, unknown>;
        expect(() => tailSamplingCreateSchema.validate(rest)).toThrow();
      }
    );

    it('accepts any processor name, so a new processor needs no model version', () => {
      expect(() =>
        tailSamplingCreateSchema.validate({
          ...validAttributes,
          processor: 'adaptive_tail_sampling',
          configJson: JSON.stringify({ rules: [] }),
        })
      ).not.toThrow();
    });

    it('rejects a processor name over the length limit', () => {
      expect(() =>
        tailSamplingCreateSchema.validate({ ...validAttributes, processor: 'p'.repeat(65) })
      ).toThrow();
    });

    it('rejects unknown keys', () => {
      expect(() => tailSamplingCreateSchema.validate({ ...validAttributes, extra: 1 })).toThrow();
    });
  });

  describe('forwardCompatibility schema', () => {
    it('drops unknown keys written by a newer Kibana instead of throwing', () => {
      expect(
        tailSamplingForwardCompatibilitySchema.validate({
          ...validAttributes,
          fromNewerVersion: 'x',
        })
      ).toEqual(validAttributes);
    });
  });
});
