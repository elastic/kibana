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
      'logs-apm.app': true,
      'logs-apm.error': true,
      'metrics-apm.app': true,
      'metrics-apm.internal': true,
      'metrics-apm.service_destination.10m': true,
      'metrics-apm.service_destination.1m': true,
      'metrics-apm.service_destination.60m': true,
      'metrics-apm.service_summary.10m': true,
      'metrics-apm.service_summary.1m': true,
      'metrics-apm.service_summary.60m': true,
      'metrics-apm.service_transaction.10m': true,
      'metrics-apm.service_transaction.1m': true,
      'metrics-apm.service_transaction.60m': true,
      'metrics-apm.transaction.10m': true,
      'metrics-apm.transaction.1m': true,
      'metrics-apm.transaction.60m': true,
      'traces-apm': true,
      'traces-apm.sampled': true,
    });
  });

  it('returns "false" for all index templates that does not exist', () => {
    const expectedIndexTemplateStates = transformResponse({
      index_templates: [],
    });
    expect(expectedIndexTemplateStates).toEqual({
      'logs-apm.app': false,
      'logs-apm.error': false,
      'metrics-apm.app': false,
      'metrics-apm.internal': false,
      'metrics-apm.service_destination.10m': false,
      'metrics-apm.service_destination.1m': false,
      'metrics-apm.service_destination.60m': false,
      'metrics-apm.service_summary.10m': false,
      'metrics-apm.service_summary.1m': false,
      'metrics-apm.service_summary.60m': false,
      'metrics-apm.service_transaction.10m': false,
      'metrics-apm.service_transaction.1m': false,
      'metrics-apm.service_transaction.60m': false,
      'metrics-apm.transaction.10m': false,
      'metrics-apm.transaction.1m': false,
      'metrics-apm.transaction.60m': false,
      'traces-apm': false,
      'traces-apm.sampled': false,
    });
  });

  it('supports namespaces', () => {
    const expectedIndexTemplateStates = transformResponse({
      index_templates: [{ name: 'logs-apm.app-my-namespace' }] as any,
    });
    expect(expectedIndexTemplateStates['logs-apm.app']).toEqual(true);
  });
});
