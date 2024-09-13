/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { fetchDurationFieldCandidates } from './fetch_duration_field_candidates';

const mockResponse = {
  indices: ['.ds-traces-apm-default-2024.06.17-000001'],
  fields: {
    'keep.this.field': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'source.ip': {
      ip: { type: 'ip', metadata_field: false, searchable: true, aggregatable: true },
    },
    // fields prefixed with 'observer.' should be ignored (via FIELD_PREFIX_TO_EXCLUDE_AS_CANDIDATE)
    'observer.version': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'observer.hostname': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    // example fields to exclude (via FIELDS_TO_EXCLUDE_AS_CANDIDATE)
    'agent.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'parent.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
  },
};

const mockApmEventClient = {
  fieldCaps: async () => {
    return mockResponse;
  },
} as unknown as APMEventClient;

describe('fetchDurationFieldCandidates', () => {
  it('returns duration field candidates', async () => {
    const response = await fetchDurationFieldCandidates({
      apmEventClient: mockApmEventClient,
      eventType: ProcessorEvent.transaction,
      start: 0,
      end: 1,
      environment: 'ENVIRONMENT_ALL',
      query: { match_all: {} },
      kuery: '',
    });

    expect(response).toStrictEqual({
      fieldCandidates: ['keep.this.field', 'source.ip'],
    });
  });
});
