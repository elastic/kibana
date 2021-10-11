/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ValuesType } from 'utility-types';
import { keyBy } from 'lodash';
import { transformConnectionsExperimental } from './transform_connections_experimental';

describe('transformConnectionsExperimental', () => {
  describe('scenario - instrumented services only', () => {
    const spanConnectionsResponse = [
      {
        key: {
          serviceName: 'Service A',
          upstreamHash: null,
          downstreamHash: '158ffcda1c50577badaa768ef77f4e4a',
        },
        doc_count: 16,
        latency: {
          value: 4.525e8,
        },
        count: {
          value: 905.0,
        },
        failed: {
          doc_count: 0,
          count: {
            value: 0.0,
          },
        },
        successful: {
          doc_count: 16,
          count: {
            value: 905.0,
          },
        },
        latest: {
          top: [
            {
              sort: ['2021-10-11T08:42:00.000Z'],
              metrics: {
                'agent.name': 'go',
                'span.destination.service.resource': 'http://service-b',
                'span.type': 'external',
                'span.subtype': 'http',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'Service B',
          upstreamHash: '158ffcda1c50577badaa768ef77f4e4a',
          downstreamHash: '5e376fda4c645a81a0dd8f1583d4403b',
        },
        doc_count: 16,
        latency: {
          value: 2.715e8,
        },
        count: {
          value: 905.0,
        },
        failed: {
          doc_count: 0,
          count: {
            value: 0.0,
          },
        },
        successful: {
          doc_count: 16,
          count: {
            value: 905.0,
          },
        },
        latest: {
          top: [
            {
              sort: ['2021-10-11T08:42:00.000Z'],
              metrics: {
                'agent.name': 'java',
                'span.destination.service.resource': 'http://service-c',
                'span.type': 'external',
                'span.subtype': 'http',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
    ];

    const transactionConnectionsResponse = [
      {
        key: {
          serviceName: 'Service A',
          upstreamHash: null,
        },
        doc_count: 905,
        latest: {
          top: [
            {
              sort: ['2021-10-11T08:42:00.000Z'],
              metrics: {
                'agent.name': 'go',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'Service B',
          upstreamHash: '158ffcda1c50577badaa768ef77f4e4a',
        },
        doc_count: 905,
        latest: {
          top: [
            {
              sort: ['2021-10-11T08:42:00.000Z'],
              metrics: {
                'agent.name': 'java',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'Service C',
          upstreamHash: '5e376fda4c645a81a0dd8f1583d4403b',
        },
        doc_count: 905,
        latest: {
          top: [
            {
              sort: ['2021-10-11T08:42:00.000Z'],
              metrics: {
                'agent.name': 'ruby',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'apm-server',
          upstreamHash: null,
        },
        doc_count: 3,
        latest: {
          top: [
            {
              sort: ['2021-10-11T08:42:53.651Z'],
              metrics: {
                'agent.name': 'go',
                'service.environment': null,
              },
            },
          ],
        },
      },
    ];

    it('returns a connection between a + b and b + c', () => {
      expect(
        transformConnectionsExperimental({
          spanConnectionsResponse,
          transactionConnectionsResponse,
          start: 0,
          end: 0,
        })
          .map((connection) =>
            [connection.source.id, connection.destination.id].join(' => ')
          )
          .sort()
      ).toEqual(['Service A => Service B', 'Service B => Service C']);
    });
  });

  describe('scenario - instrumented and non-instrumented services', () => {
    const expectedStats = {
      'Service A => Service B': {
        averageLatency: 1000,
        throughputPerMinute: 10,
        failurePercentage: 0.1,
      },
      'Service A => >elasticsearch': {
        averageLatency: 100,
        throughputPerMinute: 20,
        failurePercentage: 0,
      },
      'Service B => Service C': {
        averageLatency: 2000,
        throughputPerMinute: 5,
        failurePercentage: 0.5,
      },
      'Service B => >redis': {
        averageLatency: 50,
        throughputPerMinute: 20,
        failurePercentage: 0.2,
      },
      'Service C => >elasticsearch': {
        averageLatency: 150,
        throughputPerMinute: 1,
        failurePercentage: 1,
      },
    };

    function fromStats(stats: ValuesType<typeof expectedStats>) {
      return {
        doc_count: stats.throughputPerMinute,
        latency: {
          value: stats.averageLatency * stats.throughputPerMinute,
        },
        count: {
          value: stats.throughputPerMinute,
        },
        failed: {
          doc_count: stats.failurePercentage * stats.throughputPerMinute,
          count: {
            value: stats.failurePercentage * stats.throughputPerMinute,
          },
        },
        successful: {
          doc_count: (1 - stats.failurePercentage) * stats.throughputPerMinute,
          count: {
            value: (1 - stats.failurePercentage) * stats.throughputPerMinute,
          },
        },
      };
    }
    const spanConnectionsResponse = [
      {
        key: {
          serviceName: 'Service A',
          upstreamHash: null,
          downstreamHash: '158ffcda1c50577badaa768ef77f4e4a',
        },
        ...fromStats(expectedStats['Service A => Service B']),
        latest: {
          top: [
            {
              sort: ['2021-10-11T09:44:00.000Z'],
              metrics: {
                'agent.name': 'go',
                'span.destination.service.resource': 'http://service-b',
                'span.type': 'external',
                'span.subtype': 'http',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'Service A',
          upstreamHash: null,
          downstreamHash: 'b964d9eaf3e75eedaaec592b8412f354',
        },
        ...fromStats(expectedStats['Service A => >elasticsearch']),
        latest: {
          top: [
            {
              sort: ['2021-10-11T09:44:00.000Z'],
              metrics: {
                'agent.name': 'go',
                'span.destination.service.resource': 'elasticsearch',
                'span.type': 'db',
                'span.subtype': 'elasticsearch',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'Service B',
          upstreamHash: '158ffcda1c50577badaa768ef77f4e4a',
          downstreamHash: '5e376fda4c645a81a0dd8f1583d4403b',
        },
        ...fromStats(expectedStats['Service B => Service C']),
        latest: {
          top: [
            {
              sort: ['2021-10-11T09:44:00.000Z'],
              metrics: {
                'agent.name': 'java',
                'span.destination.service.resource': 'http://service-c',
                'span.type': 'external',
                'span.subtype': 'http',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'Service B',
          upstreamHash: '158ffcda1c50577badaa768ef77f4e4a',
          downstreamHash: 'b8d701b1c4155527b6544edd2442f2e8',
        },
        ...fromStats(expectedStats['Service B => >redis']),
        latest: {
          top: [
            {
              sort: ['2021-10-11T09:44:00.000Z'],
              metrics: {
                'agent.name': 'java',
                'span.destination.service.resource': 'redis',
                'span.type': 'db',
                'span.subtype': 'redis',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'Service C',
          upstreamHash: '5e376fda4c645a81a0dd8f1583d4403b',
          downstreamHash: 'fef7627ff1235e639018c507caf0cdaa',
        },
        ...fromStats(expectedStats['Service C => >elasticsearch']),
        latest: {
          top: [
            {
              sort: ['2021-10-11T09:44:00.000Z'],
              metrics: {
                'agent.name': 'ruby',
                'span.destination.service.resource': 'elasticsearch',
                'span.type': 'db',
                'span.subtype': 'elasticsearch',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
    ];

    const transactionConnectionsResponse = [
      {
        key: {
          serviceName: 'Service A',
          upstreamHash: null,
        },
        doc_count: 905,
        latest: {
          top: [
            {
              sort: ['2021-10-11T09:44:00.000Z'],
              metrics: {
                'agent.name': 'go',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'Service B',
          upstreamHash: '158ffcda1c50577badaa768ef77f4e4a',
        },
        doc_count: 905,
        latest: {
          top: [
            {
              sort: ['2021-10-11T09:44:00.000Z'],
              metrics: {
                'agent.name': 'java',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'Service C',
          upstreamHash: '5e376fda4c645a81a0dd8f1583d4403b',
        },
        doc_count: 905,
        latest: {
          top: [
            {
              sort: ['2021-10-11T09:44:00.000Z'],
              metrics: {
                'agent.name': 'ruby',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'apm-server',
          upstreamHash: null,
        },
        doc_count: 3,
        latest: {
          top: [
            {
              sort: ['2021-10-11T09:44:49.394Z'],
              metrics: {
                'agent.name': 'go',
                'service.environment': null,
              },
            },
          ],
        },
      },
    ];

    const start = new Date('2021-10-11T09:43:00.000Z').getTime();
    const end = new Date('2021-10-11T09:44:00.000Z').getTime();

    it('reports external connections', () => {
      const connections = transformConnectionsExperimental({
        spanConnectionsResponse,
        transactionConnectionsResponse,
        start,
        end,
      });

      expect(
        connections
          .map((connection) =>
            [connection.source.id, connection.destination.id].join(' => ')
          )
          .sort()
      ).toEqual(
        [
          'Service A => Service B',
          'Service A => >elasticsearch',
          'Service B => Service C',
          'Service B => >redis',
          'Service C => >elasticsearch',
        ].sort()
      );
    });

    it('reports the right statistics', () => {
      const connections = keyBy(
        transformConnectionsExperimental({
          spanConnectionsResponse,
          transactionConnectionsResponse,
          start,
          end,
        }),
        (value) => `${value.source.id} => ${value.destination.id}`
      );

      Object.keys(expectedStats).forEach((id) => {
        const connection = connections[id];
        // @ts-expect-error
        expect(expectedStats[id]).toEqual(connection.stats);
      });
    });
  });

  describe('scenario - opbeans load balancer', () => {
    const spanConnectionsResponse = [
      {
        key: {
          serviceName: 'opbeans-go',
          upstreamHash: null,
          downstreamHash: 'ff6213bab82c54adae3a5cb764b223c4',
        },
        doc_count: 16,
        latency: {
          value: 5.43e8,
        },
        count: {
          value: 543.0,
        },
        failed: {
          doc_count: 0,
          count: {
            value: 0.0,
          },
        },
        successful: {
          doc_count: 16,
          count: {
            value: 543.0,
          },
        },
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:31:00.000Z'],
              metrics: {
                'agent.name': 'go',
                'span.destination.service.resource': 'opbeans:3000',
                'span.type': 'external',
                'span.subtype': 'http',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'opbeans-java',
          upstreamHash: null,
          downstreamHash: 'ff6213bab82c54adae3a5cb764b223c4',
        },
        doc_count: 16,
        latency: {
          value: 5.43e8,
        },
        count: {
          value: 543.0,
        },
        failed: {
          doc_count: 0,
          count: {
            value: 0.0,
          },
        },
        successful: {
          doc_count: 16,
          count: {
            value: 543.0,
          },
        },
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:31:00.000Z'],
              metrics: {
                'agent.name': 'java',
                'span.destination.service.resource': 'opbeans:3000',
                'span.type': 'external',
                'span.subtype': 'http',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'opbeans-nodejs',
          upstreamHash: null,
          downstreamHash: 'ff6213bab82c54adae3a5cb764b223c4',
        },
        doc_count: 16,
        latency: {
          value: 5.43e8,
        },
        count: {
          value: 543.0,
        },
        failed: {
          doc_count: 0,
          count: {
            value: 0.0,
          },
        },
        successful: {
          doc_count: 16,
          count: {
            value: 543.0,
          },
        },
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:31:00.000Z'],
              metrics: {
                'agent.name': 'nodejs',
                'span.destination.service.resource': 'opbeans:3000',
                'span.type': 'external',
                'span.subtype': 'http',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'opbeans-ruby',
          upstreamHash: null,
          downstreamHash: 'ff6213bab82c54adae3a5cb764b223c4',
        },
        doc_count: 16,
        latency: {
          value: 5.43e8,
        },
        count: {
          value: 543.0,
        },
        failed: {
          doc_count: 0,
          count: {
            value: 0.0,
          },
        },
        successful: {
          doc_count: 16,
          count: {
            value: 543.0,
          },
        },
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:31:00.000Z'],
              metrics: {
                'agent.name': 'ruby',
                'span.destination.service.resource': 'opbeans:3000',
                'span.type': 'external',
                'span.subtype': 'http',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
    ];
    const transactionConnectionsResponse = [
      {
        key: {
          serviceName: 'apm-server',
          upstreamHash: null,
        },
        doc_count: 12,
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:34:33.646Z'],
              metrics: {
                'agent.name': 'go',
                'service.environment': null,
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'opbeans-go',
          upstreamHash: null,
        },
        doc_count: 543,
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:31:00.000Z'],
              metrics: {
                'agent.name': 'go',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'opbeans-go',
          upstreamHash: 'ff6213bab82c54adae3a5cb764b223c4',
        },
        doc_count: 543,
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:31:00.000Z'],
              metrics: {
                'agent.name': 'go',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'opbeans-java',
          upstreamHash: null,
        },
        doc_count: 543,
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:31:00.000Z'],
              metrics: {
                'agent.name': 'java',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'opbeans-java',
          upstreamHash: 'ff6213bab82c54adae3a5cb764b223c4',
        },
        doc_count: 543,
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:31:00.000Z'],
              metrics: {
                'agent.name': 'java',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'opbeans-nodejs',
          upstreamHash: null,
        },
        doc_count: 543,
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:31:00.000Z'],
              metrics: {
                'agent.name': 'nodejs',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'opbeans-nodejs',
          upstreamHash: 'ff6213bab82c54adae3a5cb764b223c4',
        },
        doc_count: 543,
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:31:00.000Z'],
              metrics: {
                'agent.name': 'nodejs',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'opbeans-ruby',
          upstreamHash: null,
        },
        doc_count: 543,
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:31:00.000Z'],
              metrics: {
                'agent.name': 'ruby',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
      {
        key: {
          serviceName: 'opbeans-ruby',
          upstreamHash: 'ff6213bab82c54adae3a5cb764b223c4',
        },
        doc_count: 543,
        latest: {
          top: [
            {
              sort: ['2021-10-11T13:31:00.000Z'],
              metrics: {
                'agent.name': 'ruby',
                'service.environment': 'production',
              },
            },
          ],
        },
      },
    ];

    it('reports external connections', () => {
      const connections = transformConnectionsExperimental({
        spanConnectionsResponse,
        transactionConnectionsResponse,
        start: 0,
        end: 0,
      });

      expect(
        connections
          .map((connection) =>
            [connection.source.id, connection.destination.id].join(' => ')
          )
          .sort()
      ).toEqual(
        [
          'opbeans-go => >opbeans:3000',
          'opbeans-java => >opbeans:3000',
          'opbeans-ruby => >opbeans:3000',
          'opbeans-nodejs => >opbeans:3000',
          '>opbeans:3000 => opbeans-go',
          '>opbeans:3000 => opbeans-java',
          '>opbeans:3000 => opbeans-nodejs',
          '>opbeans:3000 => opbeans-ruby',
        ].sort()
      );
    });
  });
});
