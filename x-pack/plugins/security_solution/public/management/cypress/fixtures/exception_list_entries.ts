/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
export const hieListResponse = {
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

export const testExceptionListItems = [
  {
    name: 'Trusted Apps',
    pageId: 'trusted_apps',
    listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
    testEntry: {
      comments: [],
      description: '',
      entries: [
        {
          field: 'process.hash.sha256',
          value: 'd8a928b2043db77e340b523547bf16cb4aa483f0645fe0a290ed1f20aab76257',
          type: 'match',
          operator: 'included',
        },
      ],
      name: 'test trusted app',
      namespace_type: 'agnostic',
      tags: [],
      type: 'simple',
      os_types: ['macos'],
    },
  },
  {
    name: 'Event Filters',
    pageId: 'event_filters',
    listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
    testEntry: {
      comments: [],
      description: '',
      entries: [
        {
          field: 'file.path.text',
          operator: 'included',
          type: 'wildcard',
          value: '/usr/*/docs',
        },
      ],
      name: 'test event filter',
      namespace_type: 'agnostic',
      tags: [],
      type: 'simple',
      os_types: ['macos'],
    },
  },
  {
    name: 'Host Isolation Exceptions',
    pageId: 'host_isolation_exceptions',
    listId: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
    testEntry: {
      comments: [],
      description: '',
      entries: [
        {
          field: 'destination.ip',
          operator: 'included',
          type: 'match',
          value: '10.20.30.50',
        },
      ],
      name: 'test host isolation exception',
      namespace_type: 'agnostic',
      tags: [],
      type: 'simple',
      os_types: ['windows', 'linux', 'macos'],
    },
  },
  {
    name: 'Blocklist',
    pageId: 'blocklist',
    listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
    testEntry: {
      comments: [],
      description: '',
      entries: [
        {
          field: 'file.path',
          value: ['/opt/bin'],
          type: 'match_any',
          operator: 'included',
        },
      ],
      name: 'test blocklist',
      namespace_type: 'agnostic',
      tags: [],
      type: 'simple',
      os_types: ['macos'],
    },
  },
];
