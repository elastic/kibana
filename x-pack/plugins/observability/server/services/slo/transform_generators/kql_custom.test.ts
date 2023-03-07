/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createKQLCustomIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../fixtures/slo';
import { KQLCustomTransformGenerator } from './kql_custom';

const generator = new KQLCustomTransformGenerator();

describe('KQL Custom Transform Generator', () => {
  describe('validation', () => {
    it('throws when the KQL numerator is invalid', () => {
      const anSLO = createSLO({
        indicator: createKQLCustomIndicator({ good: '{ kql.query: invalid' }),
      });
      expect(() => generator.getTransformParams(anSLO)).toThrow(/Invalid KQL/);
    });
    it('throws when the KQL denominator is invalid', () => {
      const anSLO = createSLO({
        indicator: createKQLCustomIndicator({ total: '{ kql.query: invalid' }),
      });
      expect(() => generator.getTransformParams(anSLO)).toThrow(/Invalid KQL/);
    });
    it('throws when the KQL query_filter is invalid', () => {
      const anSLO = createSLO({
        indicator: createKQLCustomIndicator({ filter: '{ kql.query: invalid' }),
      });
      expect(() => generator.getTransformParams(anSLO)).toThrow(/Invalid KQL/);
    });
  });

  it('returns the expected transform params with every specified indicator params', async () => {
    const anSLO = createSLO({ indicator: createKQLCustomIndicator() });
    const transform = generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot({
      transform_id: expect.any(String),
      source: { runtime_mappings: { 'slo.id': { script: { source: expect.any(String) } } } },
    });
    expect(transform.transform_id).toEqual(`slo-${anSLO.id}-${anSLO.revision}`);
    expect(transform.source.runtime_mappings!['slo.id']).toMatchObject({
      script: { source: `emit('${anSLO.id}')` },
    });
    expect(transform.source.runtime_mappings!['slo.revision']).toMatchObject({
      script: { source: `emit(${anSLO.revision})` },
    });
  });

  it('returns the expected transform params for timeslices slo', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      indicator: createKQLCustomIndicator(),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot({
      transform_id: expect.any(String),
      source: { runtime_mappings: { 'slo.id': { script: { source: expect.any(String) } } } },
    });
  });

  it('filters the source using the kql query', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({ filter: 'labels.groupId: group-4' }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.source.query).toMatchSnapshot();
  });

  it('uses the provided index', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({ index: 'my-own-index*' }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.source.index).toBe('my-own-index*');
  });

  it('aggregates using the numerator kql', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({
        good: 'latency < 400 and (http.status_code: 2xx or http.status_code: 3xx or http.status_code: 4xx)',
      }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.numerator']).toMatchSnapshot();
  });

  it('aggregates using the denominator kql', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({
        total: 'http.status_code: *',
      }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.denominator']).toMatchSnapshot();
  });
});
