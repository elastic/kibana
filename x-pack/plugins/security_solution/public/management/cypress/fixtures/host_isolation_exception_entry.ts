/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const hieEntry = {
  data: [
    {
      _version: 'WzI1MjAsMV0=',
      comments: [],
      created_at: '2023-01-12T10:14:28.385Z',
      created_by: 'elastic',
      description: 'Description of host isolation exception',
      entries: [
        {
          field: 'destination.ip',
          operator: 'included',
          type: 'match',
          value: '10.153.77.81',
        },
      ],
      id: 'test_id',
      item_id: 'test_host_isolation_exception_item_id',
      list_id: 'endpoint_host_isolation_exceptions',
      name: 'test host isolation exception',
      namespace_type: 'agnostic',
      os_types: ['windows', 'linux', 'macos'],
      tags: [],
      tie_breaker_id: 'be01ec60-3f12-4cf4-9130-cdc3fc8ad397',
      type: 'simple',
      updated_at: '2023-01-12T10:14:28.385Z',
      updated_by: 'elastic',
    },
  ],
  page: 1,
  per_page: 10,
  total: 1,
};
