/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { endpointFilters } from '.';

describe('Filters Schema Test', () => {
  it('accepts a single host status', () => {
    expect(
      endpointFilters.validate({
        host_status: ['error'],
      })
    ).toBeTruthy();
  });

  it('accepts multiple host status filters', () => {
    expect(
      endpointFilters.validate({
        host_status: ['offline', 'unenrolling'],
      })
    ).toBeTruthy();
  });

  it('rejects invalid statuses', () => {
    expect(() =>
      endpointFilters.validate({
        host_status: ['foobar'],
      })
    ).toThrowError();
  });

  it('accepts a KQL string', () => {
    expect(
      endpointFilters.validate({
        kql: 'whatever.field',
      })
    ).toBeTruthy();
  });

  it('accepts KQL + status', () => {
    expect(
      endpointFilters.validate({
        kql: 'thing.var',
        host_status: ['online'],
      })
    ).toBeTruthy();
  });

  it('accepts no filters', () => {
    expect(endpointFilters.validate({})).toBeTruthy();
  });
});
