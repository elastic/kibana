import { calculateAverageMetrics } from './calculate_metrics';

describe('calculateAverageMetrics', () => {
  it('calculates average metrics', () => {
    const entities = [
      {
        agent: {
          name: ['go'],
        },
        data_stream: {
          type: ['bar'],
        },
        entity: {
          metric: {
            failedTransactionRate: [0.5, 0.5],
            latency: [500, 500],
            logErrorRate: [null, null],
            logRatePerMinute: [null, null],
            throughput: [0.5, 0.5],
          },
        },
        environments: ['apm-only-1-env'],
        name: 'apm-only-1',
      },
    ];

    const result = calculateAverageMetrics(entities);

    expect(result).toEqual([
      {
        agent: {
          name: ['go'],
        },
        data_stream: {
          type: ['bar'],
        },
        entity: {
          metric: {
            failedTransactionRate: 0.5,
            latency: 500,
            logErrorRate: null,
            logRatePerMinute: null,
            throughput: 0.5,
          },
        },
        environments: ['apm-only-1-env'],
        name: 'apm-only-1',
      },
    ]);
  });
});
