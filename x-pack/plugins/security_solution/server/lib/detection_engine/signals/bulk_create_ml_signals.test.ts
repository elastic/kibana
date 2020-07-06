/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transformAnomalyFieldsToEcs } from './bulk_create_ml_signals';

const buildMockAnomaly = () => ({
  job_id: 'rare_process_by_host_linux_ecs',
  result_type: 'record',
  probability: 0.03406145177566593,
  multi_bucket_impact: -0.0,
  record_score: 10.86784984522809,
  initial_record_score: 10.86784984522809,
  bucket_span: 900,
  detector_index: 0,
  is_interim: false,
  timestamp: 1584482400000,
  by_field_name: 'process.name',
  by_field_value: 'gzip',
  partition_field_name: 'host.name',
  partition_field_value: 'rock01',
  function: 'rare',
  function_description: 'rare',
  typical: [0.03406145177566593],
  actual: [1.0],
  influencers: [
    {
      influencer_field_name: 'user.name',
      influencer_field_values: ['root'],
    },
    {
      influencer_field_name: 'process.pid',
      influencer_field_values: ['123'],
    },
    {
      influencer_field_name: 'host.name',
      influencer_field_values: ['rock01'],
    },
  ],
  'process.name': ['gzip'],
  'process.pid': ['123'],
  'user.name': ['root'],
  'host.name': ['rock01'],
});

describe('transformAnomalyFieldsToEcs', () => {
  it('adds a @timestamp field based on timestamp', () => {
    const anomaly = buildMockAnomaly();
    const result = transformAnomalyFieldsToEcs(anomaly);
    const expectedTime = '2020-03-17T22:00:00.000Z';

    expect(result['@timestamp']).toEqual(expectedTime);
  });

  it('deletes dotted influencer fields', () => {
    const anomaly = buildMockAnomaly();
    const result = transformAnomalyFieldsToEcs(anomaly);

    const ecsKeys = Object.keys(result);
    expect(ecsKeys).not.toContain('user.name');
    expect(ecsKeys).not.toContain('process.pid');
    expect(ecsKeys).not.toContain('host.name');
  });

  it('deletes dotted entity field', () => {
    const anomaly = buildMockAnomaly();
    const result = transformAnomalyFieldsToEcs(anomaly);

    const ecsKeys = Object.keys(result);
    expect(ecsKeys).not.toContain('process.name');
  });

  it('creates nested influencer fields', () => {
    const anomaly = buildMockAnomaly();
    const result = transformAnomalyFieldsToEcs(anomaly);

    expect(result.process.pid).toEqual(['123']);
    expect(result.user.name).toEqual(['root']);
    expect(result.host.name).toEqual(['rock01']);
  });

  it('creates nested entity field', () => {
    const anomaly = buildMockAnomaly();
    const result = transformAnomalyFieldsToEcs(anomaly);

    expect(result.process.name).toEqual(['gzip']);
  });
});
