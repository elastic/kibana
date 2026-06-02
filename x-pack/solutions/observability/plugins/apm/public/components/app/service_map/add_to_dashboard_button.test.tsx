/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

// Mock the URL reader so we can control `controlSelections` per test without touching window.location.
jest.mock('./use_filter_url_sync', () => ({
  readInitialAppStateFromRawUrl: jest.fn(),
}));

import { readInitialAppStateFromRawUrl } from './use_filter_url_sync';
// We exercise the non-exported `capturePageFilters` via the same module that re-exports it via
// `AddToDashboardButton`'s save path. To keep the test focused on the pure logic, we re-import
// from a dedicated test wrapper that just re-exports the helper.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __testOnly__ } = require('./add_to_dashboard_button') as {
  __testOnly__: {
    capturePageFilters: (args: {
      urlKuery: string;
      urlServiceName: string | undefined;
      filterManagerFilters: Filter[];
    }) => { kuery: string | undefined; service_name: string | undefined };
  };
};

const mockedReader = readInitialAppStateFromRawUrl as jest.MockedFunction<
  typeof readInitialAppStateFromRawUrl
>;

function phraseFilter(field: string, value: string, opts: Partial<Filter['meta']> = {}): Filter {
  return {
    meta: { key: field, type: 'phrase', params: { query: value }, ...opts },
    query: { match_phrase: { [field]: value } },
  } as Filter;
}

describe('capturePageFilters', () => {
  beforeEach(() => {
    mockedReader.mockReset();
  });

  it('returns no kuery / no service_name when nothing is set', () => {
    mockedReader.mockReturnValue(null);
    const result = __testOnly__.capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [],
    });
    expect(result).toEqual({ kuery: undefined, service_name: undefined });
  });

  it('passes URL service_name through and wraps URL kuery in parens', () => {
    mockedReader.mockReturnValue(null);
    const result = __testOnly__.capturePageFilters({
      urlKuery: 'span.type:"db"',
      urlServiceName: 'checkoutService',
      filterManagerFilters: [],
    });
    expect(result.service_name).toBe('checkoutService');
    expect(result.kuery).toBe('(span.type:"db")');
  });

  it('promotes a single Controls API service.name selection to service_name when no URL one', () => {
    mockedReader.mockReturnValue({
      controlSelections: { 'service.name': ['payment'] },
    });
    const result = __testOnly__.capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [],
    });
    expect(result.service_name).toBe('payment');
    // service.name was promoted, so it should NOT also appear as a KQL clause.
    expect(result.kuery).toBeUndefined();
  });

  it('keeps multi-value Controls service.name as a KQL clause', () => {
    mockedReader.mockReturnValue({
      controlSelections: { 'service.name': ['payment', 'checkout'] },
    });
    const result = __testOnly__.capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [],
    });
    expect(result.service_name).toBeUndefined();
    expect(result.kuery).toBe('service.name: ("payment" or "checkout")');
  });

  it('strips service.environment from Controls selections (handled by dedicated URL param)', () => {
    mockedReader.mockReturnValue({
      controlSelections: { 'service.environment': ['production'], 'cloud.region': ['us-east-1'] },
    });
    const result = __testOnly__.capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [],
    });
    expect(result.kuery).toBe('cloud.region: "us-east-1"');
  });

  it('converts filter-bar pills to KQL clauses, skipping environment pills', () => {
    mockedReader.mockReturnValue(null);
    const result = __testOnly__.capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [
        phraseFilter('service.environment', 'production'), // dropped
        phraseFilter('transaction.type', 'request'),
      ],
    });
    expect(result.kuery).toBe('transaction.type: "request"');
  });

  it('dedupes a service.name pill that matches the promoted service_name', () => {
    mockedReader.mockReturnValue({
      controlSelections: { 'service.name': ['payment'] },
    });
    const result = __testOnly__.capturePageFilters({
      urlKuery: '',
      urlServiceName: undefined,
      filterManagerFilters: [phraseFilter('service.name', 'payment')],
    });
    expect(result.service_name).toBe('payment');
    expect(result.kuery).toBeUndefined();
  });

  it('combines URL kuery + Controls + pills with AND', () => {
    mockedReader.mockReturnValue({
      controlSelections: { 'cloud.region': ['us-east-1'] },
    });
    const result = __testOnly__.capturePageFilters({
      urlKuery: 'span.type:"db"',
      urlServiceName: undefined,
      filterManagerFilters: [phraseFilter('agent.name', 'java')],
    });
    expect(result.kuery).toBe(
      '(span.type:"db") and cloud.region: "us-east-1" and agent.name: "java"'
    );
  });
});
