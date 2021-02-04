/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildMockAnomaly } from './bulk_create_ml_signals.mock';
import { transformAnomalyFieldsToEcs } from './bulk_create_ml_signals';

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

  it('promotes the record_score to a temporary __anomaly_score field', () => {
    const anomaly = buildMockAnomaly();
    const result = transformAnomalyFieldsToEcs(anomaly);

    expect(result.__anomaly_score).not.toEqual(anomaly.initial_record_score);
    expect(result.__anomaly_score).toEqual(anomaly.record_score);
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
