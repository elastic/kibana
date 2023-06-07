/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createMetricCustomIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../fixtures/slo';
import { MetricCustomTransformGenerator } from './metric_custom';

const generator = new MetricCustomTransformGenerator();

describe('Metric Custom Transform Generator', () => {
  describe('validation', () => {
    it('throws when the good equation is invalid', () => {
      const anSLO = createSLO({
        indicator: createMetricCustomIndicator({
          good: {
            metrics: [{ name: 'A', aggregation: 'sum', field: 'good' }],
            equation: 'Math.floor(A / z)',
          },
        }),
      });
      expect(() => generator.getTransformParams(anSLO)).toThrow(/Invalid equation/);
    });
    it('throws when the total equation is invalid', () => {
      const anSLO = createSLO({
        indicator: createMetricCustomIndicator({
          total: {
            metrics: [{ name: 'A', aggregation: 'sum', field: 'total' }],
            equation: 'Math.foo(A)',
          },
        }),
      });
      expect(() => generator.getTransformParams(anSLO)).toThrow(/Invalid equation/);
    });
    it('throws when the query_filter is invalid', () => {
      const anSLO = createSLO({
        indicator: createMetricCustomIndicator({ filter: '{ kql.query: invalid' }),
      });
      expect(() => generator.getTransformParams(anSLO)).toThrow(/Invalid KQL/);
    });
  });

  it('returns the expected transform params with every specified indicator params', async () => {
    const anSLO = createSLO({ indicator: createMetricCustomIndicator() });
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
      indicator: createMetricCustomIndicator(),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot({
      transform_id: expect.any(String),
      source: { runtime_mappings: { 'slo.id': { script: { source: expect.any(String) } } } },
    });
  });

  it('filters the source using the kql query', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({ filter: 'labels.groupId: group-4' }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.source.query).toMatchSnapshot();
  });

  it('uses the provided index', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({ index: 'my-own-index*' }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.source.index).toBe('my-own-index*');
  });

  it('uses the provided timestampField', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({
        timestampField: 'my-date-field',
      }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.sync?.time?.field).toBe('my-date-field');
    // @ts-ignore
    expect(transform.pivot?.group_by['@timestamp'].date_histogram.field).toBe('my-date-field');
  });

  it('aggregates using the numerator equation', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({
        good: {
          metrics: [{ name: 'A', aggregation: 'sum', field: 'good' }],
          equation: 'A * 100',
        },
      }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.numerator']).toMatchSnapshot();
  });

  it('aggregates using the denominator equation', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({
        total: {
          metrics: [{ name: 'A', aggregation: 'sum', field: 'total' }],
          equation: 'A / 100',
        },
      }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.denominator']).toMatchSnapshot();
  });
});
