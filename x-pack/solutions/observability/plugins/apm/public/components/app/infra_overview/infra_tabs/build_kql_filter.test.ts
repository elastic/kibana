/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildKqlFilter } from './build_kql_filter';

describe('buildKqlFilter', () => {
  it('should build correct KQL for a single value', () => {
    const field = 'host.name';
    const values = ['host1'];
    const expectedKql = 'host.name: ("host1")';

    const kqlFilter = buildKqlFilter(field, values);

    expect(kqlFilter).toBe(expectedKql);
  });

  it('should build correct KQL for multiple values', () => {
    const field = 'host.name';
    const values = ['host1', 'host2', 'host3'];
    const expectedKql = 'host.name: ("host1" OR "host2" OR "host3")';

    const kqlFilter = buildKqlFilter(field, values);

    expect(kqlFilter).toBe(expectedKql);
  });
});
