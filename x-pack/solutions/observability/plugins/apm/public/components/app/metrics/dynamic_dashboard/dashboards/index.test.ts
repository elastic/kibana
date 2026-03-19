/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLanguageDashboard } from '.';

describe('getLanguageDashboard', () => {
  it('returns Java dashboard for java agent', () => {
    expect(getLanguageDashboard('java')).toBeDefined();
  });

  it('returns Java dashboard for OTel java agent', () => {
    expect(getLanguageDashboard('opentelemetry/java/elastic')).toBeDefined();
  });

  it('returns Java dashboard for vanilla OTel java', () => {
    expect(getLanguageDashboard('opentelemetry/java')).toBeDefined();
  });

  it('returns undefined for unknown agent', () => {
    expect(getLanguageDashboard('my-custom-agent')).toBeUndefined();
  });

  it('returns undefined when agentName is undefined', () => {
    expect(getLanguageDashboard(undefined)).toBeUndefined();
  });

  it('returns undefined for nodejs (not yet implemented)', () => {
    expect(getLanguageDashboard('nodejs')).toBeUndefined();
  });

  it('returns panel slots when called with an index pattern', () => {
    const dashboardFn = getLanguageDashboard('java');
    const slots = dashboardFn!('metrics-*');
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty('id');
    expect(slots[0]).toHaveProperty('title');
    expect(slots[0]).toHaveProperty('gridConfig');
    expect(slots[0]).toHaveProperty('variants');
    expect(slots[0].variants.length).toBeGreaterThan(0);
  });
});
