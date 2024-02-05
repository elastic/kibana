/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilterQuery } from './get_filter_query';

describe('getFilterQuery', () => {
  it('should generate correct filter query when original query is not empty', () => {
    const query = 'container.id: container-1';
    const groups = [
      { field: 'container.id', value: 'container-0' },
      { field: 'host.name', value: 'host-0' },
    ];

    expect(getFilterQuery(query, groups)).toBe(
      '(container.id: container-1) and container.id: container-0 and host.name: host-0'
    );
  });

  it('should generate correct filter query when original query is empty', () => {
    const query = '';
    const groups = [
      { field: 'container.id', value: 'container-0' },
      { field: 'host.name', value: 'host-0' },
    ];

    expect(getFilterQuery(query, groups)).toBe('container.id: container-0 and host.name: host-0');
  });

  it('should generate correct filter query when original query and groups both are empty', () => {
    const query = '';
    const groups = undefined;

    expect(getFilterQuery(query, groups)).toBe('');
  });
});
