/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAPMTransactionErrorRateIndicator, createSLO } from '../fixtures/slo';
import { ApmTransactionErrorRateTransformGenerator } from './apm_transaction_error_rate';

const generator = new ApmTransactionErrorRateTransformGenerator();

describe('Transform Generator', () => {
  it('builds common runtime mappings without group by', async () => {
    const slo = createSLO({
      id: 'irrelevant',
      indicator: createAPMTransactionErrorRateIndicator(),
    });
    const transform = generator.buildCommonRuntimeMappings(slo);

    expect(transform).toEqual({
      'slo.id': {
        script: {
          source: "emit('irrelevant')",
        },
        type: 'keyword',
      },
      'slo.revision': {
        script: {
          source: 'emit(1)',
        },
        type: 'long',
      },
    });

    const commonGroupBy = generator.buildCommonGroupBy(slo);

    expect(commonGroupBy).toEqual({
      '@timestamp': {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: '1m',
        },
      },
      'slo.id': {
        terms: {
          field: 'slo.id',
        },
      },
      'slo.revision': {
        terms: {
          field: 'slo.revision',
        },
      },
    });
  });

  it.each(['example', ['example']])(
    'builds common runtime mappings and group by with single group by',
    async (groupBy) => {
      const indicator = createAPMTransactionErrorRateIndicator();
      const slo = createSLO({
        id: 'irrelevant',
        groupBy,
        indicator,
      });
      const commonRuntime = generator.buildCommonRuntimeMappings(slo);

      expect(commonRuntime).toEqual({
        'slo.id': {
          script: {
            source: "emit('irrelevant')",
          },
          type: 'keyword',
        },
        'slo.revision': {
          script: {
            source: 'emit(1)',
          },
          type: 'long',
        },
      });

      const commonGroupBy = generator.buildCommonGroupBy(slo);

      expect(commonGroupBy).toEqual({
        '@timestamp': {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '1m',
          },
        },
        'slo.groupings.example': {
          terms: {
            field: 'example',
          },
        },
        'slo.id': {
          terms: {
            field: 'slo.id',
          },
        },
        'slo.revision': {
          terms: {
            field: 'slo.revision',
          },
        },
      });
    }
  );

  it('builds common runtime mappings without multi group by', async () => {
    const indicator = createAPMTransactionErrorRateIndicator();
    const slo = createSLO({
      id: 'irrelevant',
      groupBy: ['example1', 'example2'],
      indicator,
    });
    const commonRuntime = generator.buildCommonRuntimeMappings(slo);

    expect(commonRuntime).toEqual({
      'slo.id': {
        script: {
          source: "emit('irrelevant')",
        },
        type: 'keyword',
      },
      'slo.revision': {
        script: {
          source: 'emit(1)',
        },
        type: 'long',
      },
    });

    const commonGroupBy = generator.buildCommonGroupBy(slo);

    expect(commonGroupBy).toEqual({
      '@timestamp': {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: '1m',
        },
      },
      'slo.groupings.example1': {
        terms: {
          field: 'example1',
        },
      },
      'slo.groupings.example2': {
        terms: {
          field: 'example2',
        },
      },
      'slo.id': {
        terms: {
          field: 'slo.id',
        },
      },
      'slo.revision': {
        terms: {
          field: 'slo.revision',
        },
      },
    });
  });
});
