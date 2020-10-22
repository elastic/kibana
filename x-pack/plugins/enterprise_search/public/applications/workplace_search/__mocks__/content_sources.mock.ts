/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const contentSources = [
  {
    id: '123',
    serviceType: 'custom',
    searchable: true,
    supportedByLicense: true,
    status: 'foo',
    statusMessage: 'bar',
    name: 'source',
    documentCount: '123',
    isFederatedSource: false,
    errorReason: 0,
    allowsReauth: true,
    boost: 1,
  },
  {
    id: '124',
    serviceType: 'jira',
    searchable: true,
    supportedByLicense: true,
    status: 'synced',
    statusMessage: 'all green',
    name: 'Jira',
    documentCount: '34234',
    isFederatedSource: false,
    errorReason: 0,
    allowsReauth: true,
    boost: 0.5,
  },
];
