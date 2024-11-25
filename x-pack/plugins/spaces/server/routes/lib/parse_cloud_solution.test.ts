/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseCloudSolution } from './parse_cloud_solution';

describe('parseCloudSolution', () => {
  // Test valid cases
  it('should return "es" for "elasticsearch"', () => {
    expect(parseCloudSolution('elasticsearch')).toBe('es');
  });

  it('should return "es" for "search"', () => {
    expect(parseCloudSolution('search')).toBe('es');
  });

  it('should return "oblt" for "observability"', () => {
    expect(parseCloudSolution('observability')).toBe('oblt');
  });

  it('should return "security" for "security"', () => {
    expect(parseCloudSolution('security')).toBe('security');
  });

  // Test case insensitivity
  it('should return "es" for "ELASTICSEARCH"', () => {
    expect(parseCloudSolution('ELASTICSEARCH')).toBe('es');
  });

  it('should return "es" for "SEARCH"', () => {
    expect(parseCloudSolution('SEARCH')).toBe('es');
  });

  it('should return "oblt" for "OBSERVABILITY"', () => {
    expect(parseCloudSolution('OBSERVABILITY')).toBe('oblt');
  });

  it('should return "security" for "SECURITY"', () => {
    expect(parseCloudSolution('SECURITY')).toBe('security');
  });

  // Test for undefined or missing inputs
  it('should throw an error when value is undefined', () => {
    expect(() => parseCloudSolution(undefined)).toThrow(
      /undefined is not a valid solution value set by Cloud/
    );
  });

  it('should throw an error when value is null', () => {
    expect(() => parseCloudSolution(null as unknown as string)).toThrow(
      /null is not a valid solution value set by Cloud/
    );
  });

  // Test invalid values
  it('should throw an error for invalid values', () => {
    expect(() => parseCloudSolution('invalid')).toThrow(
      /invalid is not a valid solution value set by Cloud/
    );
  });

  it('should throw an error for empty string', () => {
    expect(() => parseCloudSolution('')).toThrow(/ is not a valid solution value set by Cloud/);
  });

  it('should throw an error for unlisted valid input', () => {
    expect(() => parseCloudSolution('unlisted')).toThrow(
      /unlisted is not a valid solution value set by Cloud/
    );
  });
});
