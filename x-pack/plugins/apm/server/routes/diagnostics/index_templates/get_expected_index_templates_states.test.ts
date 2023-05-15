/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformResponse } from './get_expected_index_templates_states';
import { indexTemplateResponse } from './index_template_response.mock';

describe('transformResponse', () => {
  it('returns "true" for all index templates that exists', () => {
    const expectedIndexTemplateStates = transformResponse(
      indexTemplateResponse
    );
    expect(expectedIndexTemplateStates).toEqual({
      'logs-apm.app': { exists: true, name: 'logs-apm.app' },
      'logs-apm.error': { exists: true, name: 'logs-apm.error' },
      'metrics-apm.app': { exists: true, name: 'metrics-apm.app' },
      'metrics-apm.internal': { exists: true, name: 'metrics-apm.internal' },
      'metrics-apm.service_destination.10m': {
        exists: true,
        name: 'metrics-apm.service_destination.10m',
      },
      'metrics-apm.service_destination.1m': {
        exists: true,
        name: 'metrics-apm.service_destination.1m',
      },
      'metrics-apm.service_destination.60m': {
        exists: true,
        name: 'metrics-apm.service_destination.60m',
      },
      'metrics-apm.service_summary.10m': {
        exists: true,
        name: 'metrics-apm.service_summary.10m',
      },
      'metrics-apm.service_summary.1m': {
        exists: true,
        name: 'metrics-apm.service_summary.1m',
      },
      'metrics-apm.service_summary.60m': {
        exists: true,
        name: 'metrics-apm.service_summary.60m',
      },
      'metrics-apm.service_transaction.10m': {
        exists: true,
        name: 'metrics-apm.service_transaction.10m',
      },
      'metrics-apm.service_transaction.1m': {
        exists: true,
        name: 'metrics-apm.service_transaction.1m',
      },
      'metrics-apm.service_transaction.60m': {
        exists: true,
        name: 'metrics-apm.service_transaction.60m',
      },
      'metrics-apm.transaction.10m': {
        exists: true,
        name: 'metrics-apm.transaction.10m',
      },
      'metrics-apm.transaction.1m': {
        exists: true,
        name: 'metrics-apm.transaction.1m',
      },
      'metrics-apm.transaction.60m': {
        exists: true,
        name: 'metrics-apm.transaction.60m',
      },
      'traces-apm': { exists: true, name: 'traces-apm' },
      'traces-apm.sampled': { exists: true, name: 'traces-apm.sampled' },
    });
  });

  it('returns "false" for all index templates that does not exist', () => {
    const expectedIndexTemplateStates = transformResponse({
      index_templates: [],
    });
    expect(expectedIndexTemplateStates).toEqual({
      'logs-apm.app': { exists: false },
      'logs-apm.error': { exists: false },
      'metrics-apm.app': { exists: false },
      'metrics-apm.internal': { exists: false },
      'metrics-apm.service_destination.10m': { exists: false },
      'metrics-apm.service_destination.1m': { exists: false },
      'metrics-apm.service_destination.60m': { exists: false },
      'metrics-apm.service_summary.10m': { exists: false },
      'metrics-apm.service_summary.1m': { exists: false },
      'metrics-apm.service_summary.60m': { exists: false },
      'metrics-apm.service_transaction.10m': { exists: false },
      'metrics-apm.service_transaction.1m': { exists: false },
      'metrics-apm.service_transaction.60m': { exists: false },
      'metrics-apm.transaction.10m': { exists: false },
      'metrics-apm.transaction.1m': { exists: false },
      'metrics-apm.transaction.60m': { exists: false },
      'traces-apm': { exists: false },
      'traces-apm.sampled': { exists: false },
    });
  });

  it('supports namespaces', () => {
    const expectedIndexTemplateStates = transformResponse({
      index_templates: [{ name: 'logs-apm.app-my-namespace' }] as any,
    });
    expect(expectedIndexTemplateStates['logs-apm.app']).toEqual({
      exists: true,
      name: 'logs-apm.app-my-namespace',
    });
  });
});
