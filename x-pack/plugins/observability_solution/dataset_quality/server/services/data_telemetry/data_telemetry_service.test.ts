/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, unset } from 'lodash';

import { set } from '@kbn/safer-lodash-set';
import { ElasticsearchClient, type Logger } from '@kbn/core/server';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { TelemetryPluginStart } from '@kbn/telemetry-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { DataTelemetryEvent } from './types';
import { BREATHE_DELAY_MEDIUM, MAX_STREAMS_TO_REPORT } from './constants';
import { DataTelemetryService } from './data_telemetry_service';

// Mock the constants module to speed up and simplify the tests
jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  BREATHE_DELAY_SHORT: 10,
  BREATHE_DELAY_MEDIUM: 50,
  BREATHE_DELAY_LONG: 100,

  MAX_STREAMS_TO_REPORT: 50,

  LOGS_DATASET_INDEX_PATTERNS: [
    {
      pattern: 'test-pattern-*',
      patternName: 'test',
      shipper: 'custom',
    },
    {
      pattern: 'test-pattern-2-*',
      patternName: 'test-2',
      shipper: 'custom-2',
    },
  ],
}));

const TEST_TIMEOUT = 60 * 1000;

describe('DataTelemetryService', () => {
  let service: DataTelemetryService;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockAnalyticsSetup: jest.Mocked<AnalyticsServiceSetup>;
  let mockTelemetryStart: jest.Mocked<TelemetryPluginStart>;
  let mockLogger: jest.Mocked<Logger>;
  let mockTaskManagerSetup: ReturnType<typeof taskManagerMock.createSetup>;
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let runTask: ReturnType<typeof setupMocks>['runTask'];

  describe('Data Telemetry Task', () => {
    beforeEach(async () => {
      const mocks = setupMocks();
      mockEsClient = mocks.mockEsClient;
      mockLogger = mocks.mockLogger;
      mockAnalyticsSetup = mocks.mockAnalyticsSetup;
      mockTelemetryStart = mocks.mockTelemetryStart;
      mockTaskManagerSetup = mocks.taskManagerSetup;
      mockTaskManagerStart = mocks.taskManagerStart;
      runTask = mocks.runTask;

      service = new DataTelemetryService(mockLogger);
      service.setup(mockAnalyticsSetup, mockTaskManagerSetup);
      await service.start(
        mockTelemetryStart,
        {
          elasticsearch: { client: { asInternalUser: mockEsClient } },
        } as any,
        mockTaskManagerStart
      );
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.clearAllMocks();
    });

    it('should trigger task runner run method', async () => {
      jest.spyOn(service as any, 'isTelemetryOptedIn').mockResolvedValue(true);
      const collectAndSendSpy = jest.spyOn(service as any, 'collectAndSend');

      await runTask();

      // Assert collectAndSend is called
      expect(collectAndSendSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Docs Info', () => {
    beforeEach(async () => {
      const mocks = setupMocks();
      mockEsClient = mocks.mockEsClient;
      mockLogger = mocks.mockLogger;
      mockAnalyticsSetup = mocks.mockAnalyticsSetup;
      mockTelemetryStart = mocks.mockTelemetryStart;
      mockTaskManagerSetup = mocks.taskManagerSetup;
      mockTaskManagerStart = mocks.taskManagerStart;
      runTask = mocks.runTask;

      service = new DataTelemetryService(mockLogger);
      service.setup(mockAnalyticsSetup, mockTaskManagerSetup);
      await service.start(
        mockTelemetryStart,
        {
          elasticsearch: { client: { asInternalUser: mockEsClient } },
        } as any,
        mockTaskManagerStart
      );

      jest.spyOn(service as any, 'isTelemetryOptedIn').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.clearAllMocks();
    });

    it(
      'should collect and send telemetry after startup and every interval',
      async () => {
        const collectAndSendSpy = jest.spyOn(service as any, 'collectAndSend');

        await runTask();
        expect(collectAndSendSpy).toHaveBeenCalledTimes(1);

        await sleepForBreathDelay();
        expect(mockEsClient.indices.getMapping).toHaveBeenCalledTimes(1);

        await runTask();
        expect(collectAndSendSpy).toHaveBeenCalledTimes(2);

        await sleepForBreathDelay();
        expect(mockEsClient.indices.getMapping).toHaveBeenCalledTimes(2);

        // getMapping should not be called for non logs data streams e.g. logs-synth
        MOCK_SYNTH_DATA_STREAMS[0].indices.forEach((index) => {
          expect(mockEsClient.indices.getMapping).not.toHaveBeenCalledWith({
            index: index.index_name,
          });
        });
      },
      TEST_TIMEOUT
    );

    it(
      'should stop collecting and sending telemetry if stopped',
      async () => {
        const collectAndSendSpy = jest.spyOn(service as any, 'collectAndSend');

        await runTask();
        expect(collectAndSendSpy).toHaveBeenCalledTimes(1);

        service.stop();

        await runTask();
        await sleepForBreathDelay();
        expect(collectAndSendSpy).toHaveBeenCalledTimes(1);
      },
      TEST_TIMEOUT
    );

    it(
      'should not collect data if telemetry is not opted in',
      async () => {
        jest.spyOn(service as any, 'isTelemetryOptedIn').mockResolvedValue(false);

        const collectAndSendSpy = jest.spyOn(service as any, 'collectAndSend');

        await runTask();
        expect(collectAndSendSpy).not.toHaveBeenCalled();

        await runTask();
        await sleepForBreathDelay();
        expect(collectAndSendSpy).not.toHaveBeenCalled();

        // Assert that logger.debug is called with appropriate message
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '[Logs Data Telemetry] Telemetry is not opted-in.'
        );
      },
      TEST_TIMEOUT
    );

    it(
      'should not collect if number of data streams exceed MAX_STREAMS_TO_REPORT',
      async () => {
        (mockEsClient.indices.getDataStream as unknown as jest.Mock).mockResolvedValue({
          data_streams: Array.from({ length: MAX_STREAMS_TO_REPORT + 1 }, (_, i) => ({
            name: `logs-postgresql.log-default-${i}`,
            indices: [
              {
                index_name: `.ds-logs-postgresql.log-default-${i}-000001`,
              },
            ],
            _meta: {
              managed: true,
              description: 'default logs template installed by x-pack',
            },
          })),
        });

        await runTask();
        await sleepForBreathDelay();
        expect(mockEsClient.indices.getMapping).not.toHaveBeenCalled();
      },
      TEST_TIMEOUT
    );

    it(
      'creates and sends the telemetry events',
      async () => {
        jest.spyOn(service as any, 'isTelemetryOptedIn').mockResolvedValue(true);

        const reportEventsSpy = jest.spyOn(service as any, 'reportEvents');

        await runTask();
        await sleepForBreathDelay();

        expect(reportEventsSpy).toHaveBeenCalledTimes(1);
        expect(reportEventsSpy.mock?.lastCall?.[0]).toEqual([
          expect.objectContaining({
            doc_count: 4000 + 500 + 200,
            failure_store_doc_count: 300,
            index_count: 2 + 1 + 1,
            failure_store_index_count: 1,
            namespace_count: 1 + 1,
            size_in_bytes: 10089898 + 800000 + 500000,
            pattern_name: 'test',
            managed_by: ['fleet'],
            package_name: ['activemq'],
            beat: [],
          }),
        ]);
      },
      TEST_TIMEOUT
    );
  });

  describe('Fields Info', () => {
    beforeEach(async () => {
      const mocks = setupMocks();
      mockEsClient = mocks.mockEsClient;
      mockLogger = mocks.mockLogger;
      mockAnalyticsSetup = mocks.mockAnalyticsSetup;
      mockTelemetryStart = mocks.mockTelemetryStart;
      mockTaskManagerSetup = mocks.taskManagerSetup;
      mockTaskManagerStart = mocks.taskManagerStart;
      runTask = mocks.runTask;

      service = new DataTelemetryService(mockLogger);
      service.setup(mockAnalyticsSetup, mockTaskManagerSetup);
      await service.start(
        mockTelemetryStart,
        {
          elasticsearch: { client: { asInternalUser: mockEsClient } },
        } as any,
        mockTaskManagerStart
      );

      jest.spyOn(service as any, 'isTelemetryOptedIn').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.clearAllMocks();
    });

    it(
      'should correctly calculate total fields and count of resource fields',
      async () => {
        jest.spyOn(service as any, 'isTelemetryOptedIn').mockResolvedValue(true);

        const reportEventsSpy = jest.spyOn(service as any, 'reportEvents');

        await runTask();
        await sleepForBreathDelay();

        expect(reportEventsSpy).toHaveBeenCalledTimes(1);
        const lastCall = reportEventsSpy.mock?.lastCall?.[0] as [Partial<DataTelemetryEvent>];
        expect(lastCall?.[0]?.field_count).toBe(8);
        expect(lastCall?.[0]?.field_existence).toEqual({
          'container.id': 3000 + 500,
          'host.name': 3000 + 500,
          message: 3000,
          '@timestamp': 3000 + 500 + 200,
          'data_stream.dataset': 3000 + 500 + 200,
          'data_stream.namespace': 3000 + 500 + 200,
          'data_stream.type': 3000 + 500 + 200,
        });
      },
      TEST_TIMEOUT
    );
  });
});

function sleepForBreathDelay() {
  return new Promise((resolve) => setTimeout(resolve, BREATHE_DELAY_MEDIUM * 10));
}

function setupMocks() {
  const mockEsClient = {
    indices: {
      stats: jest.fn().mockImplementation(() => {
        const emptyAllStats: any = { _all: {} };

        // _all shouldn't be read hence overriding with empty here
        return Promise.resolve({
          ...emptyAllStats,
          indices: {
            ...emptyAllStats.indices,
            ...MOCK_POSTGRES_DEFAULT_STATS.indices,
            ...MOCK_POSTGRES_NON_DEFAULT_STATS.indices,
            ...MOCK_ACTIVE_MQ_DEFAULT_STATS.indices,
          },
        });
      }),
      getDataStream: jest.fn().mockResolvedValue({
        data_streams: [
          ...MOCK_POSTGRES_DATA_STREAMS,
          ...MOCK_SYNTH_DATA_STREAMS,
          ...MOCK_ACTIVE_MQ_FLEET_DATA_STREAMS,
        ],
      }),
      get: jest.fn().mockResolvedValue(MOCK_INDICES),
      getMapping: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          ...MOCK_APACHE_GENERIC_INDEX_MAPPING,
          ...MOCK_POSTGRES_DEFAULT_MAPPINGS,
          ...MOCK_POSTGRES_NON_DEFAULT_MAPPINGS,
          ...MOCK_ACTIVE_MQ_DEFAULT_MAPPINGS,
        });
      }),
    },
    info: jest.fn().mockResolvedValue({}),
    transport: {
      request: jest.fn().mockImplementation((params) => {
        if (params.path?.includes('_stats') && params?.querystring?.failure_store === 'only') {
          return MOCK_ACTIVE_MQ_FAILURE_STATS;
        }

        return MOCK_ACTIVE_MQ_FAILURE_STATS;
      }),
    },
  } as unknown as jest.Mocked<ElasticsearchClient>;

  const mockLogger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  const mockAnalyticsSetup = {
    getTelemetryUrl: jest.fn().mockResolvedValue(new URL('https://telemetry.elastic.co')),
  } as unknown as jest.Mocked<AnalyticsServiceSetup>;

  const mockTelemetryStart = {
    getIsOptedIn: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<TelemetryPluginStart>;

  const taskManagerSetup = taskManagerMock.createSetup();
  const taskManagerStart = taskManagerMock.createStart();

  const runTask = () => {
    const taskDefinitions = taskManagerSetup.registerTaskDefinitions.mock.calls[0][0];
    const taskType = Object.keys(taskDefinitions)[0];
    const taskRunner = taskDefinitions[taskType].createTaskRunner({ taskInstance: {} as any });

    return taskRunner.run();
  };

  return {
    mockEsClient,
    mockLogger,
    mockAnalyticsSetup,
    mockTelemetryStart,
    taskManagerSetup,
    taskManagerStart,
    runTask,
  };
}

const MOCK_INDICES = {
  'apache-generic-index': {},
  '.ds-logs-postgresql.log-default-2024.07.31-000001': {},
  '.ds-logs-postgresql.log-default-2024.08.31-000002': {},
  '.ds-logs-synth.01-default-2024.07.31-000001': {},
  '.ds-logs-active-mq.fleet-2024.07.31-000001': {},
};

const MOCK_POSTGRES_DATA_STREAMS = [
  {
    name: 'logs-postgresql.log-default',
    indices: [
      {
        index_name: '.ds-logs-postgresql.log-default-2024.07.31-000001',
      },
      {
        index_name: '.ds-logs-postgresql.log-default-2024.08.31-000002',
      },
    ],
    _meta: {
      managed: true,
      description: 'default logs template installed by x-pack',
    },
  },
  {
    name: 'logs-postgresql.log-non-default',
    indices: [
      {
        index_name: '.ds-logs-postgresql.log-non-default-2024.07.31-000001',
      },
    ],
    _meta: {
      managed: true,
      description: 'default logs template installed by x-pack',
    },
  },
];
const MOCK_POSTGRES_DEFAULT_STATS = {
  _all: {
    primaries: {
      docs: {
        count: 4000,
        deleted: 0,
        total_size_in_bytes: 10089898,
      },
      store: {
        size_in_bytes: 10089898,
      },
    },
  },
  indices: {
    '.ds-logs-postgresql.log-default-2024.07.31-000001': {
      primaries: {
        docs: {
          count: 1000,
          deleted: 0,
          total_size_in_bytes: 1000000,
        },
        store: {
          size_in_bytes: 1000000,
        },
      },
    },
    '.ds-logs-postgresql.log-default-2024.08.31-000002': {
      primaries: {
        docs: {
          count: 3000,
          deleted: 0,
          total_size_in_bytes: 9089898,
        },
        store: {
          size_in_bytes: 9089898,
        },
      },
    },
  },
};

const MOCK_POSTGRES_NON_DEFAULT_STATS = {
  _all: {
    primaries: {
      docs: {
        count: 500,
        deleted: 0,
        total_size_in_bytes: 800000,
      },
      store: {
        size_in_bytes: 800000,
      },
    },
  },
  indices: {
    '.ds-logs-postgresql.log-non-default-2024.07.31-000001': {
      primaries: {
        docs: {
          count: 500,
          deleted: 0,
          total_size_in_bytes: 800000,
        },
        store: {
          size_in_bytes: 800000,
        },
      },
    },
  },
};

const MOCK_POSTGRES_DEFAULT_MAPPINGS = {
  '.ds-logs-postgresql.log-default-2024.08.31-000002': {
    mappings: {
      properties: {
        '@timestamp': {
          type: 'date',
          ignore_malformed: false,
        },
        container: {
          properties: {
            id: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
          },
        },
        custom_field_01: {
          type: 'float',
        },
        data_stream: {
          properties: {
            dataset: {
              type: 'constant_keyword',
              value: 'postgresql.log',
            },
            namespace: {
              type: 'constant_keyword',
              value: 'default',
            },
            type: {
              type: 'constant_keyword',
              value: 'logs',
            },
          },
        },
        host: {
          properties: {
            name: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
          },
        },
        message: {
          type: 'text',
        },
      },
    },
  },
};

const MOCK_POSTGRES_NON_DEFAULT_MAPPINGS = {
  '.ds-logs-postgresql.log-non-default-2024.07.31-000001': cloneDeep(
    MOCK_POSTGRES_DEFAULT_MAPPINGS['.ds-logs-postgresql.log-default-2024.08.31-000002']
  ),
};

// Set namespace to non-default
set(
  MOCK_POSTGRES_NON_DEFAULT_MAPPINGS,
  "['.ds-logs-postgresql.log-non-default-2024.07.31-000001'].mappings.properties.data_stream.properties.namespace.value",
  'non-default'
);

// Remove message field to test different field count
unset(
  MOCK_POSTGRES_NON_DEFAULT_MAPPINGS,
  "['.ds-logs-postgresql.log-non-default-2024.07.31-000001'].mappings.properties.message"
);

const MOCK_SYNTH_DATA_STREAMS = [
  {
    name: 'logs-synth.01-default',
    indices: [
      {
        index_name: '.ds-logs-synth.01-default-2024.07.31-000001',
      },
      {
        index_name: '.ds-logs-synth.01-default-2024.08.31-000002',
      },
    ],
    _meta: {
      managed: true,
      description: 'default logs template installed by x-pack',
    },
  },
];

const MOCK_APACHE_GENERIC_INDEX_MAPPING = {
  'apache-generic-index': {
    mappings: {
      properties: {
        '@timestamp': {
          type: 'date',
          ignore_malformed: false,
        },
      },
    },
  },
};

const MOCK_ACTIVE_MQ_FLEET_DATA_STREAMS = [
  {
    name: 'logs-active-mq.fleet',
    indices: [
      {
        index_name: '.ds-logs-active-mq.fleet-2024.07.31-000001',
      },
    ],
    _meta: {
      package: {
        name: 'activemq',
      },
      managed_by: 'fleet',
      managed: true,
    },
  },
];

const MOCK_ACTIVE_MQ_DEFAULT_STATS = {
  _all: {
    primaries: {
      docs: {
        count: 200,
        deleted: 0,
        total_size_in_bytes: 500000,
      },
      store: {
        size_in_bytes: 500000,
      },
    },
  },
  indices: {
    '.ds-logs-active-mq.fleet-2024.07.31-000001': {
      primaries: {
        docs: {
          count: 200,
          deleted: 0,
          total_size_in_bytes: 500000,
        },
        store: {
          size_in_bytes: 500000,
        },
      },
    },
  },
};

const MOCK_ACTIVE_MQ_FAILURE_STATS = {
  _all: {
    primaries: {
      docs: {
        count: 300,
        deleted: 0,
        total_size_in_bytes: 700000,
      },
      store: {
        size_in_bytes: 700000,
      },
    },
  },
  indices: {
    '.fs-logs-active-mq.fleet-2024.07.31-000001': {
      primaries: {
        docs: {
          count: 300,
          deleted: 0,
          total_size_in_bytes: 700000,
        },
        store: {
          size_in_bytes: 700000,
        },
      },
    },
  },
};

const MOCK_ACTIVE_MQ_DEFAULT_MAPPINGS = {
  '.ds-logs-active-mq.fleet-2024.07.31-000001': {
    mappings: {
      properties: {
        '@timestamp': {
          type: 'date',
          ignore_malformed: false,
        },
        data_stream: {
          properties: {
            dataset: {
              type: 'constant_keyword',
              value: 'active-mq.fleet',
            },
            namespace: {
              type: 'constant_keyword',
              value: 'default',
            },
            type: {
              type: 'constant_keyword',
              value: 'logs',
            },
          },
        },
      },
    },
  },
};
