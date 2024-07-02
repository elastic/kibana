/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseOnboardingSolution } from './parse_onboarding_default_solution';

describe('parseOnboardingSolution', () => {
  it('should return undefined if there is no default solution defined', () => {
    expect(parseOnboardingSolution()).toBeUndefined();
  });

  it('should map correctly the cloud values to the Kibana values, regardless of case', () => {
    [
      ['elasticsearch', 'es'],
      ['Elasticsearch', 'es'],
      ['observability', 'oblt'],
      ['Observability', 'oblt'],
      ['security', 'security'],
      ['Security', 'security'],
    ].forEach(([cloudValue, kibanaValue]) => {
      expect(parseOnboardingSolution(cloudValue)).toBe(kibanaValue);
      expect(parseOnboardingSolution(cloudValue.toUpperCase())).toBe(kibanaValue);
      expect(parseOnboardingSolution(cloudValue.toLowerCase())).toBe(kibanaValue);
    });
  });

  it('should return undefined for unknown values', () => {
    expect(parseOnboardingSolution('unknown')).toBeUndefined();
  });
});
