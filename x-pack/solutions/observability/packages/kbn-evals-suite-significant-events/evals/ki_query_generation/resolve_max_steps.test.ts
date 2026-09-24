/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveMaxSteps } from './resolve_max_steps';

describe('resolveMaxSteps', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it('returns undefined when unset', () => {
    delete process.env.KI_QUERY_GENERATION_MAX_STEPS;
    expect(resolveMaxSteps()).toBeUndefined();
  });

  it('returns undefined for an empty or blank string', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '';
    expect(resolveMaxSteps()).toBeUndefined();
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '   ';
    expect(resolveMaxSteps()).toBeUndefined();
  });

  it('parses a valid integer', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '12';
    expect(resolveMaxSteps()).toBe(12);
  });

  it('accepts the minimum value of 2', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '2';
    expect(resolveMaxSteps()).toBe(2);
  });

  it('accepts the maximum value of 20', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '20';
    expect(resolveMaxSteps()).toBe(20);
  });

  it('accepts a trimmed value', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = ' 12 ';
    expect(resolveMaxSteps()).toBe(12);
  });

  it('accepts leading-zero integer input', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '007';
    expect(resolveMaxSteps()).toBe(7);
  });

  it('rejects zero', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '0';
    expect(() => resolveMaxSteps()).toThrow(/from 2 to 20/);
  });

  it('rejects one', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '1';
    expect(() => resolveMaxSteps()).toThrow(/from 2 to 20/);
  });

  it('rejects decimals', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '1.5';
    expect(() => resolveMaxSteps()).toThrow(/from 2 to 20/);
  });

  it('rejects negative integers', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '-1';
    expect(() => resolveMaxSteps()).toThrow(/from 2 to 20/);
  });

  it('rejects values above 20', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '21';
    expect(() => resolveMaxSteps()).toThrow(/from 2 to 20/);
  });
});
