/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromiseReturnType } from '../../../../../observability/typings/common';
import { getDestinationMap } from './get_destination_map';
import { getMetrics } from './get_metrics';
import {
  getMetricsWithDestinationIds,
  joinMetricsByDestinationId,
  calculateMetricValues,
  calculateDestinationMetrics,
  offsetPreviousMetrics,
  getCalculateImpact,
} from './helpers';

const destinationMap = {
  postgresql: {
    id: { 'span.destination.service.resource': 'postgresql' },
    span: {
      type: 'db',
      subtype: 'postgresql',
      destination: { service: { resource: 'postgresql' } },
    },
  },
  'opbeans:3000': {
    id: {
      service: {
        name: 'opbeans-go',
        environment: 'testing',
        agentName: 'go',
      },
    },
    span: {
      type: 'external',
      subtype: 'http',
      destination: { service: { resource: 'opbeans:3000' } },
    },
    service: { name: 'opbeans-go', environment: 'testing' },
    agent: { name: 'go' },
  },
} as PromiseReturnType<typeof getDestinationMap>;

const currentPeriodMetrics = [
  {
    span: { destination: { service: { resource: 'postgresql' } } },
    value: { count: 184, latency_sum: 284666, error_count: 0 },
    timeseries: [
      { x: 1618858380000, count: 12, latency_sum: 18830, error_count: 0 },
      { x: 1618858440000, count: 8, latency_sum: 9847, error_count: 0 },
    ],
  },
  {
    span: { destination: { service: { resource: 'opbeans:3000' } } },
    value: { count: 18, latency_sum: 5498767, error_count: 0 },
    timeseries: [
      { x: 1618858380000, count: 0, latency_sum: 0, error_count: 0 },
      { x: 1618858440000, count: 2, latency_sum: 17893, error_count: 0 },
    ],
  },
];
describe('service dependencies helpers', () => {
  describe('getMetricsWithDestinationIds', () => {
    it('merges current and previous metrics based on destination', () => {
      const previousPeriodMetrics = [
        {
          span: { destination: { service: { resource: 'postgresql' } } },
          value: { count: 187, latency_sum: 465185, error_count: 0 },
          timeseries: [
            { x: 1618771980000, count: 16, latency_sum: 31378, error_count: 0 },
            { x: 1618772040000, count: 4, latency_sum: 5774, error_count: 0 },
          ],
        },
        {
          span: { destination: { service: { resource: 'opbeans:3000' } } },
          value: { count: 16, latency_sum: 6060038, error_count: 0 },
          timeseries: [
            { x: 1618771980000, count: 2, latency_sum: 287255, error_count: 0 },
            { x: 1618772040000, count: 1, latency_sum: 27661, error_count: 0 },
          ],
        },
      ];

      expect(
        getMetricsWithDestinationIds({
          destinationMap,
          currentPeriodMetrics,
          previousPeriodMetrics,
        })
      ).toEqual([
        {
          id: { 'span.destination.service.resource': 'postgresql' },
          metrics: [
            {
              span: { destination: { service: { resource: 'postgresql' } } },
              value: { count: 184, latency_sum: 284666, error_count: 0 },
              timeseries: [
                {
                  x: 1618858380000,
                  count: 12,
                  latency_sum: 18830,
                  error_count: 0,
                },
                {
                  x: 1618858440000,
                  count: 8,
                  latency_sum: 9847,
                  error_count: 0,
                },
              ],
            },
          ],
          previousMetrics: [
            {
              span: { destination: { service: { resource: 'postgresql' } } },
              value: { count: 187, latency_sum: 465185, error_count: 0 },
              timeseries: [
                {
                  x: 1618771980000,
                  count: 16,
                  latency_sum: 31378,
                  error_count: 0,
                },
                {
                  x: 1618772040000,
                  count: 4,
                  latency_sum: 5774,
                  error_count: 0,
                },
              ],
            },
          ],
          span: {
            destination: { service: { resource: 'postgresql' } },
            type: 'db',
            subtype: 'postgresql',
          },
        },
        {
          id: {
            service: {
              name: 'opbeans-go',
              environment: 'testing',
              agentName: 'go',
            },
          },
          metrics: [
            {
              span: { destination: { service: { resource: 'opbeans:3000' } } },
              value: { count: 18, latency_sum: 5498767, error_count: 0 },
              timeseries: [
                { x: 1618858380000, count: 0, latency_sum: 0, error_count: 0 },
                {
                  x: 1618858440000,
                  count: 2,
                  latency_sum: 17893,
                  error_count: 0,
                },
              ],
            },
          ],
          previousMetrics: [
            {
              span: { destination: { service: { resource: 'opbeans:3000' } } },
              value: { count: 16, latency_sum: 6060038, error_count: 0 },
              timeseries: [
                {
                  x: 1618771980000,
                  count: 2,
                  latency_sum: 287255,
                  error_count: 0,
                },
                {
                  x: 1618772040000,
                  count: 1,
                  latency_sum: 27661,
                  error_count: 0,
                },
              ],
            },
          ],
          span: {
            destination: { service: { resource: 'opbeans:3000' } },
            type: 'external',
            subtype: 'http',
          },
          service: { name: 'opbeans-go', environment: 'testing' },
          agent: { name: 'go' },
        },
      ]);
    });

    it('returns only current metrics when destination is not found on previous metrics', () => {
      const previousPeriodMetrics = [
        {
          span: { destination: { service: { resource: 'foo' } } },
          value: { count: 187, latency_sum: 465185, error_count: 0 },
          timeseries: [
            { x: 1618771980000, count: 16, latency_sum: 31378, error_count: 0 },
            { x: 1618772040000, count: 4, latency_sum: 5774, error_count: 0 },
          ],
        },
        {
          span: { destination: { service: { resource: 'bar' } } },
          value: { count: 16, latency_sum: 6060038, error_count: 0 },
          timeseries: [
            { x: 1618771980000, count: 2, latency_sum: 287255, error_count: 0 },
            { x: 1618772040000, count: 1, latency_sum: 27661, error_count: 0 },
          ],
        },
      ];
      expect(
        getMetricsWithDestinationIds({
          destinationMap,
          currentPeriodMetrics,
          previousPeriodMetrics,
        })
      ).toEqual([
        {
          id: { 'span.destination.service.resource': 'postgresql' },
          metrics: [
            {
              span: { destination: { service: { resource: 'postgresql' } } },
              value: { count: 184, latency_sum: 284666, error_count: 0 },
              timeseries: [
                {
                  x: 1618858380000,
                  count: 12,
                  latency_sum: 18830,
                  error_count: 0,
                },
                {
                  x: 1618858440000,
                  count: 8,
                  latency_sum: 9847,
                  error_count: 0,
                },
              ],
            },
          ],
          previousMetrics: [],
          span: {
            destination: { service: { resource: 'postgresql' } },
            type: 'db',
            subtype: 'postgresql',
          },
        },
        {
          id: {
            service: {
              name: 'opbeans-go',
              environment: 'testing',
              agentName: 'go',
            },
          },
          metrics: [
            {
              span: { destination: { service: { resource: 'opbeans:3000' } } },
              value: { count: 18, latency_sum: 5498767, error_count: 0 },
              timeseries: [
                { x: 1618858380000, count: 0, latency_sum: 0, error_count: 0 },
                {
                  x: 1618858440000,
                  count: 2,
                  latency_sum: 17893,
                  error_count: 0,
                },
              ],
            },
          ],
          previousMetrics: [],
          span: {
            destination: { service: { resource: 'opbeans:3000' } },
            type: 'external',
            subtype: 'http',
          },
          service: { name: 'opbeans-go', environment: 'testing' },
          agent: { name: 'go' },
        },
      ]);
    });

    it('returns empty array when current metric is empty', () => {
      const previousPeriodMetrics = [
        {
          span: { destination: { service: { resource: 'postgresql' } } },
          value: { count: 187, latency_sum: 465185, error_count: 0 },
          timeseries: [
            { x: 1618771980000, count: 16, latency_sum: 31378, error_count: 0 },
            { x: 1618772040000, count: 4, latency_sum: 5774, error_count: 0 },
          ],
        },
        {
          span: { destination: { service: { resource: 'opbeans:3000' } } },
          value: { count: 16, latency_sum: 6060038, error_count: 0 },
          timeseries: [
            { x: 1618771980000, count: 2, latency_sum: 287255, error_count: 0 },
            { x: 1618772040000, count: 1, latency_sum: 27661, error_count: 0 },
          ],
        },
      ];

      expect(
        getMetricsWithDestinationIds({
          destinationMap,
          currentPeriodMetrics: [] as PromiseReturnType<typeof getMetrics>,
          previousPeriodMetrics,
        })
      ).toEqual([]);
    });

    it('returns empty previous metric when previous metric is empty', () => {
      expect(
        getMetricsWithDestinationIds({
          destinationMap,
          currentPeriodMetrics,
          previousPeriodMetrics: [] as PromiseReturnType<typeof getMetrics>,
        })
      ).toEqual([
        {
          id: { 'span.destination.service.resource': 'postgresql' },
          metrics: [
            {
              span: { destination: { service: { resource: 'postgresql' } } },
              value: { count: 184, latency_sum: 284666, error_count: 0 },
              timeseries: [
                {
                  x: 1618858380000,
                  count: 12,
                  latency_sum: 18830,
                  error_count: 0,
                },
                {
                  x: 1618858440000,
                  count: 8,
                  latency_sum: 9847,
                  error_count: 0,
                },
              ],
            },
          ],
          previousMetrics: [],
          span: {
            destination: { service: { resource: 'postgresql' } },
            type: 'db',
            subtype: 'postgresql',
          },
        },
        {
          id: {
            service: {
              name: 'opbeans-go',
              environment: 'testing',
              agentName: 'go',
            },
          },
          metrics: [
            {
              span: { destination: { service: { resource: 'opbeans:3000' } } },
              value: { count: 18, latency_sum: 5498767, error_count: 0 },
              timeseries: [
                { x: 1618858380000, count: 0, latency_sum: 0, error_count: 0 },
                {
                  x: 1618858440000,
                  count: 2,
                  latency_sum: 17893,
                  error_count: 0,
                },
              ],
            },
          ],
          previousMetrics: [],
          span: {
            destination: { service: { resource: 'opbeans:3000' } },
            type: 'external',
            subtype: 'http',
          },
          service: { name: 'opbeans-go', environment: 'testing' },
          agent: { name: 'go' },
        },
      ]);
    });
  });

  describe('joinMetricsByDestinationId', () => {
    it('returns empty when receives an empty metrics', () => {
      expect(
        joinMetricsByDestinationId(
          [] as ReturnType<typeof getMetricsWithDestinationIds>
        )
      ).toEqual([]);
    });
    it('returns metrics joinned by destination', () => {
      const metricsWithDestinationIds = [
        {
          id: { 'span.destination.service.resource': 'postgresql' },
          metrics: [
            {
              span: { destination: { service: { resource: 'postgresql' } } },
              value: { count: 184, latency_sum: 284666, error_count: 0 },
              timeseries: [
                {
                  x: 1618858380000,
                  count: 12,
                  latency_sum: 18830,
                  error_count: 0,
                },
                {
                  x: 1618858440000,
                  count: 8,
                  latency_sum: 9847,
                  error_count: 0,
                },
              ],
            },
          ],
          previousMetrics: [
            {
              span: { destination: { service: { resource: 'postgresql' } } },
              value: { count: 187, latency_sum: 465185, error_count: 0 },
              timeseries: [
                {
                  x: 1618771980000,
                  count: 16,
                  latency_sum: 31378,
                  error_count: 0,
                },
                {
                  x: 1618772040000,
                  count: 4,
                  latency_sum: 5774,
                  error_count: 0,
                },
              ],
            },
          ],
          span: {
            destination: { service: { resource: 'postgresql' } },
            type: 'db',
            subtype: 'postgresql',
          },
        },
        {
          id: {
            service: {
              name: 'opbeans-go',
              environment: 'testing',
              agentName: 'go',
            },
          },
          metrics: [
            {
              span: { destination: { service: { resource: 'opbeans:3000' } } },
              value: { count: 18, latency_sum: 5498767, error_count: 0 },
              timeseries: [
                { x: 1618858380000, count: 0, latency_sum: 0, error_count: 0 },
                {
                  x: 1618858440000,
                  count: 2,
                  latency_sum: 17893,
                  error_count: 0,
                },
              ],
            },
          ],
          previousMetrics: [
            {
              span: { destination: { service: { resource: 'opbeans:3000' } } },
              value: { count: 16, latency_sum: 6060038, error_count: 0 },
              timeseries: [
                {
                  x: 1618771980000,
                  count: 2,
                  latency_sum: 287255,
                  error_count: 0,
                },
                {
                  x: 1618772040000,
                  count: 1,
                  latency_sum: 27661,
                  error_count: 0,
                },
              ],
            },
          ],
          span: {
            destination: { service: { resource: 'opbeans:3000' } },
            type: 'external',
            subtype: 'http',
          },
          service: { name: 'opbeans-go', environment: 'testing' },
          agent: { name: 'go' },
        },
      ] as ReturnType<typeof getMetricsWithDestinationIds>;
      expect(joinMetricsByDestinationId(metricsWithDestinationIds)).toEqual([
        {
          id: { 'span.destination.service.resource': 'postgresql' },
          metrics: [
            {
              span: { destination: { service: { resource: 'postgresql' } } },
              value: { count: 184, latency_sum: 284666, error_count: 0 },
              timeseries: [
                {
                  x: 1618858380000,
                  count: 12,
                  latency_sum: 18830,
                  error_count: 0,
                },
                {
                  x: 1618858440000,
                  count: 8,
                  latency_sum: 9847,
                  error_count: 0,
                },
              ],
            },
          ],
          previousMetrics: [
            {
              span: { destination: { service: { resource: 'postgresql' } } },
              value: { count: 187, latency_sum: 465185, error_count: 0 },
              timeseries: [
                {
                  x: 1618771980000,
                  count: 16,
                  latency_sum: 31378,
                  error_count: 0,
                },
                {
                  x: 1618772040000,
                  count: 4,
                  latency_sum: 5774,
                  error_count: 0,
                },
              ],
            },
          ],
          span: {
            destination: { service: { resource: 'postgresql' } },
            type: 'db',
            subtype: 'postgresql',
          },
        },
        {
          id: {
            service: {
              name: 'opbeans-go',
              environment: 'testing',
              agentName: 'go',
            },
          },
          metrics: [
            {
              span: { destination: { service: { resource: 'opbeans:3000' } } },
              value: { count: 18, latency_sum: 5498767, error_count: 0 },
              timeseries: [
                { x: 1618858380000, count: 0, latency_sum: 0, error_count: 0 },
                {
                  x: 1618858440000,
                  count: 2,
                  latency_sum: 17893,
                  error_count: 0,
                },
              ],
            },
          ],
          previousMetrics: [
            {
              span: { destination: { service: { resource: 'opbeans:3000' } } },
              value: { count: 16, latency_sum: 6060038, error_count: 0 },
              timeseries: [
                {
                  x: 1618771980000,
                  count: 2,
                  latency_sum: 287255,
                  error_count: 0,
                },
                {
                  x: 1618772040000,
                  count: 1,
                  latency_sum: 27661,
                  error_count: 0,
                },
              ],
            },
          ],
          span: {
            destination: { service: { resource: 'opbeans:3000' } },
            type: 'external',
            subtype: 'http',
          },
          service: { name: 'opbeans-go', environment: 'testing' },
          agent: { name: 'go' },
        },
      ]);
    });
  });
  describe('calculateMetricValues', () => {
    it('returns default value when empty', () => {
      expect(
        calculateMetricValues(
          [] as ReturnType<typeof joinMetricsByDestinationId>[0]['metrics']
        )
      ).toEqual({
        value: { count: 0, latency_sum: 0, error_count: 0 },
        timeseries: [],
      });
    });
    it('calculate metrics', () => {
      const metrics = [
        {
          span: { destination: { service: { resource: 'opbeans:3000' } } },
          value: { count: 18, latency_sum: 5498767, error_count: 0 },
          timeseries: [
            { x: 1618858380000, count: 0, latency_sum: 0, error_count: 0 },
            {
              x: 1618858440000,
              count: 2,
              latency_sum: 17893,
              error_count: 0,
            },
          ],
        },
      ];
      expect(calculateMetricValues(metrics)).toEqual({
        value: { count: 18, latency_sum: 5498767, error_count: 0 },
        timeseries: [
          { x: 1618858380000, count: 0, latency_sum: 0, error_count: 0 },
          { x: 1618858440000, count: 2, latency_sum: 17893, error_count: 0 },
        ],
      });
    });
  });

  describe('calculateDestinationMetrics', () => {
    it('return empty timeseries', () => {
      expect(
        calculateDestinationMetrics({
          mergedMetrics: {
            value: { count: 18, latency_sum: 5498767, error_count: 0 },
            timeseries: [],
          },
          start: new Date('2021-04-19T22:04:12.205Z').valueOf(),
          end: new Date('2021-04-19T22:09:17.798Z').valueOf(),
        })
      ).toEqual({
        errorRate: { timeseries: [], value: 0 },
        latency: { timeseries: [], value: 305487.05555555556 },
        throughput: { timeseries: [], value: 3.534112365139254 },
      });
    });

    it('returns metrics with timeseries', () => {
      expect(
        calculateDestinationMetrics({
          mergedMetrics: {
            value: { count: 18, latency_sum: 5498767, error_count: 0 },
            timeseries: [
              { x: 1618858380000, count: 0, latency_sum: 0, error_count: 0 },
              {
                x: 1618858440000,
                count: 2,
                latency_sum: 17893,
                error_count: 0,
              },
            ],
          },
          start: new Date('2021-04-19T22:04:12.205Z').valueOf(),
          end: new Date('2021-04-19T22:09:17.798Z').valueOf(),
        })
      ).toEqual({
        errorRate: {
          timeseries: [
            { x: 1618858380000, y: null },
            { x: 1618858440000, y: 0 },
          ],
          value: 0,
        },
        latency: {
          timeseries: [
            { x: 1618858380000, y: null },
            { x: 1618858440000, y: 8946.5 },
          ],
          value: 305487.05555555556,
        },
        throughput: {
          timeseries: [
            { x: 1618858380000, y: null },
            { x: 1618858440000, y: 0.3926791516821393 },
          ],
          value: 3.534112365139254,
        },
      });
    });
  });

  describe('offsetPreviousMetrics', () => {
    it('return empty object when no previous period is informed', () => {
      expect(
        offsetPreviousMetrics({
          currentDestinationMetrics: {
            errorRate: {
              timeseries: [
                { x: 1618858380000, y: null },
                { x: 1618858440000, y: 0 },
              ],
              value: 0,
            },
            latency: {
              timeseries: [
                { x: 1618858380000, y: null },
                { x: 1618858440000, y: 8946.5 },
              ],
              value: 305487.05555555556,
            },
            throughput: {
              timeseries: [
                { x: 1618858380000, y: null },
                { x: 1618858440000, y: 0.3926791516821393 },
              ],
              value: 3.534112365139254,
            },
          },
        })
      ).toEqual({});
    });
    it('offsets previous metrics timeseries', () => {
      const currentDestinationMetrics = {
        errorRate: {
          timeseries: [
            { x: 1618858380000, y: null },
            { x: 1618858440000, y: 0 },
          ],
          value: 0,
        },
        latency: {
          timeseries: [
            { x: 1618858380000, y: null },
            { x: 1618858440000, y: 8946.5 },
          ],
          value: 305487.05555555556,
        },
        throughput: {
          timeseries: [
            { x: 1618858380000, y: null },
            { x: 1618858440000, y: 0.3926791516821393 },
          ],
          value: 3.534112365139254,
        },
      };
      const previousDestinationMetrics = {
        errorRate: {
          timeseries: [
            { x: 1618771980000, y: 1 },
            { x: 1618772040000, y: 2 },
          ],
          value: 0,
        },
        latency: {
          timeseries: [
            { x: 1618771980000, y: 0 },
            { x: 1618772040000, y: 5 },
          ],
          value: 305487.05555555556,
        },
        throughput: {
          timeseries: [
            { x: 1618771980000, y: 4 },
            { x: 1618772040000, y: 7 },
          ],
          value: 3.534112365139254,
        },
      };

      const offsetData = offsetPreviousMetrics({
        currentDestinationMetrics,
        previousDestinationMetrics,
      });
      expect(offsetData.latency?.timeseries.map(({ x }) => x)).toEqual(
        currentDestinationMetrics.latency.timeseries.map(({ x }) => x)
      );
      expect(offsetData.throughput?.timeseries.map(({ x }) => x)).toEqual(
        currentDestinationMetrics.throughput.timeseries.map(({ x }) => x)
      );
      expect(offsetData.errorRate?.timeseries.map(({ x }) => x)).toEqual(
        currentDestinationMetrics.errorRate.timeseries.map(({ x }) => x)
      );
    });
  });

  describe('getCalculateImpact', () => {
    it('returns a function', () => {
      const latencySums = [1, 2, 3, 4];
      const calculateImpact = getCalculateImpact(latencySums);
      expect(typeof calculateImpact === 'function').toBeTruthy();
    });
    it('returns 0 when values are null', () => {
      const latencySums = [1, 2, 3, 4];
      const calculateImpact = getCalculateImpact(latencySums);
      expect(
        calculateImpact({ latencyValue: null, throughputValue: null })
      ).toEqual(0);
    });
    it('returns correct impact', () => {
      const latencySums = [1, 2, 3, 4];
      const calculateImpact = getCalculateImpact(latencySums);
      expect(calculateImpact({ latencyValue: 3, throughputValue: 1 })).toEqual(
        66.66666666666666
      );
    });
  });
});
