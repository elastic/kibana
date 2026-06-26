/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { __testOnly__ } from './add_to_dashboard_button';

const { capturePageFilters } = __testOnly__;

function phraseFilter(field: string, value: string, opts: Partial<Filter['meta']> = {}): Filter {
  return {
    meta: { key: field, type: 'phrase', params: { query: value }, ...opts },
    query: { match_phrase: { [field]: value } },
  } as Filter;
}

function existsFilter(field: string, opts: Partial<Filter['meta']> = {}): Filter {
  return {
    meta: { key: field, type: 'exists', ...opts },
    query: { exists: { field } },
  } as Filter;
}

describe('capturePageFilters', () => {
  it('returns no kuery / no service_name when nothing is set', () => {
    const result = capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [],
      controlSelections: {},
    });
    expect(result).toEqual({ kuery: undefined, service_name: undefined });
  });

  it('passes URL service_name through and wraps URL kuery in parens', () => {
    const result = capturePageFilters({
      urlKuery: 'span.type:"db"',
      urlServiceName: 'checkoutService',
      filterManagerFilters: [],
      controlSelections: {},
    });
    expect(result.service_name).toBe('checkoutService');
    expect(result.kuery).toBe('(span.type:"db")');
  });

  it('promotes a single Controls API service.name selection to service_name when no URL one', () => {
    const result = capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [],
      controlSelections: { 'service.name': ['payment'] },
    });
    expect(result.service_name).toBe('payment');
    // service.name was promoted, so it should NOT also appear as a KQL clause.
    expect(result.kuery).toBeUndefined();
  });

  it('keeps multi-value Controls service.name as a KQL clause', () => {
    const result = capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [],
      controlSelections: { 'service.name': ['payment', 'checkout'] },
    });
    expect(result.service_name).toBeUndefined();
    expect(result.kuery).toBe('service.name: ("payment" or "checkout")');
  });

  it('strips service.environment from Controls selections (handled by dedicated URL param)', () => {
    const result = capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [],
      controlSelections: { 'service.environment': ['production'], 'cloud.region': ['us-east-1'] },
    });
    expect(result.kuery).toBe('cloud.region: "us-east-1"');
  });

  it('converts filter-bar pills to KQL clauses, skipping environment pills', () => {
    const result = capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [
        phraseFilter('service.environment', 'production'), // dropped
        phraseFilter('transaction.type', 'request'),
      ],
      controlSelections: {},
    });
    expect(result.kuery).toBe('transaction.type: "request"');
  });

  it('converts an exists filter to `field: *` (negated supported)', () => {
    const result = capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [
        existsFilter('error.id'),
        existsFilter('labels.tier', { negate: true }),
      ],
      controlSelections: {},
    });
    expect(result.kuery).toBe('error.id: * and not labels.tier: *');
  });

  it('prefixes negated phrase filters with `not`', () => {
    const result = capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [phraseFilter('transaction.type', 'request', { negate: true })],
      controlSelections: {},
    });
    expect(result.kuery).toBe('not transaction.type: "request"');
  });

  it('dedupes a service.name pill that matches the promoted service_name', () => {
    const result = capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [phraseFilter('service.name', 'payment')],
      controlSelections: { 'service.name': ['payment'] },
    });
    expect(result.service_name).toBe('payment');
    expect(result.kuery).toBeUndefined();
  });

  it('drops every service.name pill once a service name is set, even a different value', () => {
    const result = capturePageFilters({
      urlKuery: '',
      urlServiceName: 'checkout',
      filterManagerFilters: [phraseFilter('service.name', 'payment')],
      controlSelections: { 'service.name': ['payment'] },
    });
    // No conflicting `service_name` (checkout) + `service.name: payment` KQL clause.
    expect(result.service_name).toBe('checkout');
    expect(result.kuery).toBeUndefined();
  });

  it('escapes backslashes and double quotes inside phrase filter values', () => {
    const result = capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [phraseFilter('service.name', 'web\\"prod')],
      controlSelections: {},
    });
    // Backslash first, then quote — exactly two backslashes for the literal `\` and `\"` for the `"`.
    expect(result.kuery).toBe('service.name: "web\\\\\\"prod"');
  });

  it('escapes backslashes from Controls API selections too', () => {
    const result = capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [],
      controlSelections: { 'cloud.region': ['us\\east-1'] },
    });
    expect(result.kuery).toBe('cloud.region: "us\\\\east-1"');
  });

  it('combines URL kuery + Controls + pills with AND', () => {
    const result = capturePageFilters({
      urlKuery: 'span.type:"db"',
      urlServiceName: undefined,
      filterManagerFilters: [phraseFilter('agent.name', 'java')],
      controlSelections: { 'cloud.region': ['us-east-1'] },
    });
    expect(result.kuery).toBe(
      '(span.type:"db") and cloud.region: "us-east-1" and agent.name: "java"'
    );
  });
});
