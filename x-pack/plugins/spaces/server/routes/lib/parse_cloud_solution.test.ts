/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseCloudSolution } from './parse_cloud_solution';

describe('parseCloudSolution', () => {
  it('should return "es" for the input "elasticsearch"', () => {
    expect(parseCloudSolution('elasticsearch')).toBe('es');
  });

  it('should return "oblt" for the input "observability"', () => {
    expect(parseCloudSolution('observability')).toBe('oblt');
  });

  it('should return "security" for the input "security"', () => {
    expect(parseCloudSolution('security')).toBe('security');
  });

  it('should return undefined for an unrecognized input', () => {
    expect(parseCloudSolution('newSolution')).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    expect(parseCloudSolution(undefined)).toBeUndefined();
  });

  it('should be case insensitive', () => {
    expect(parseCloudSolution('ElAsTiCsEaRcH')).toBe('es');
    expect(parseCloudSolution('OBSERVABILITY')).toBe('oblt');
    expect(parseCloudSolution('SeCuRiTy')).toBe('security');
  });

  it('should return undefined for empty string input', () => {
    expect(parseCloudSolution('')).toBeUndefined();
  });
});
