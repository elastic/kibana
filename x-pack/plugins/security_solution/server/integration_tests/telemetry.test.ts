/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import axios, { type AxiosRequestConfig } from 'axios';

import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { ENDPOINT_STAGING } from '@kbn/telemetry-plugin/common/constants';

import { eventually, setupTestServers, removeFile } from './lib/helpers';
import {
  cleanupMockedAlerts,
  cleanupMockedExceptionLists,
  createMockedAlert,
  createMockedExceptionList,
  getAsyncTelemetryEventSender,
  getTelemetryTask,
  getTelemetryTaskTitle,
  getTelemetryTasks,
} from './lib/telemetry_helpers';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { Plugin as SecuritySolutionPlugin } from '../plugin';
import {
  TaskManagerPlugin,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server/plugin';
import type { SecurityTelemetryTask } from '../lib/telemetry/task';
import { TelemetryChannel } from '../lib/telemetry/types';
import type { AsyncTelemetryEventsSender } from '../lib/telemetry/async_sender';

jest.mock('axios');

const logFilePath = Path.join(__dirname, 'logs.log');

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');
const telemetrySenderStartSpy = jest.spyOn(SecuritySolutionPlugin.prototype, 'start');
const mockedAxiosGet = jest.spyOn(axios, 'get');
const mockedAxiosPost = jest.spyOn(axios, 'post');

describe('telemetry tasks', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManagerPlugin: TaskManagerStartContract;
  let tasks: SecurityTelemetryTask[];
  let asyncTelemetryEventSender: AsyncTelemetryEventsSender;
  let exceptionsList: ExceptionListSchema[] = [];
  let exceptionsListItem: ExceptionListItemSchema[] = [];

  beforeAll(async () => {
    await removeFile(logFilePath);

    const servers = await setupTestServers(logFilePath);
    esServer = servers.esServer;
    kibanaServer = servers.kibanaServer;

    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    taskManagerPlugin = taskManagerStartSpy.mock.results[0].value;

    expect(telemetrySenderStartSpy).toHaveBeenCalledTimes(1);

    tasks = getTelemetryTasks(telemetrySenderStartSpy);
    asyncTelemetryEventSender = getAsyncTelemetryEventSender(telemetrySenderStartSpy);

    // update queue config to not wait for a long bufferTimeSpanMillis
    asyncTelemetryEventSender.updateQueueConfig(TelemetryChannel.TASK_METRICS, {
      bufferTimeSpanMillis: 100,
      inflightEventsThreshold: 1_000,
      maxPayloadSizeBytes: 1024 * 1024,
    });
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAxiosGet();
  });

  afterEach(async () => {
    await cleanupMockedExceptionLists(
      exceptionsList,
      exceptionsListItem,
      kibanaServer.coreStart.savedObjects
    );
    await cleanupMockedAlerts(
      kibanaServer.coreStart.elasticsearch.client.asInternalUser,
      kibanaServer.coreStart.savedObjects
    ).then(() => {
      exceptionsList = [];
      exceptionsListItem = [];
    });
  });

  describe('detection-rules', () => {
    it('shuld execute when scheduled', async () => {
      await mockAndScheduleDetectionRulesTask();

      // wait until the events are sent to the telemetry server
      const body = await eventually(async () => {
        const found = mockedAxiosPost.mock.calls.find(([url]) => {
          return url.startsWith(ENDPOINT_STAGING) && url.endsWith('security-lists-v2');
        });

        expect(found).not.toBeFalsy();

        return JSON.parse((found ? found[1] : '{}') as string);
      });

      expect(body).not.toBeFalsy();
      expect(body.detection_rule).not.toBeFalsy();
    });

    it('should send task metrics', async () => {
      const task = await mockAndScheduleDetectionRulesTask();

      const requests = await getTaskMetricsRequests(task);

      expect(requests.length).toBeGreaterThan(0);
      requests.forEach(({ body }) => {
        const asJson = JSON.parse(body);
        expect(asJson).not.toBeFalsy();
        expect(asJson.passed).toEqual(true);
      });
    });
  });

  describe('configuration', () => {
    it('should use legacy sender by default', async () => {
      // launch a random task and verify it uses the new configuration
      const task = await mockAndScheduleDetectionRulesTask();

      const requests = await getTaskMetricsRequests(task);
      expect(requests.length).toBeGreaterThan(0);
      requests.forEach(({ config }) => {
        expect(config).not.toBeFalsy();
        if (config && config.headers) {
          expect(config.headers['X-Telemetry-Sender']).not.toEqual('async');
        }
      });
    });

    it('should use new sender when configured', async () => {
      const configTaskType = 'security:telemetry-configuration';
      const configTask = getTelemetryTask(tasks, configTaskType);

      mockAxiosGet(fakeBufferAndSizesConfigAsyncEnabled);

      await eventually(async () => {
        await taskManagerPlugin.runSoon(configTask.getTaskId());
      });

      // wait until the task finishes
      await eventually(async () => {
        const found = (await taskManagerPlugin.fetch()).docs.find(
          (t) => t.taskType === configTaskType
        );
        expect(found).toBeFalsy();
      });

      const task = await mockAndScheduleDetectionRulesTask();

      const requests = await getTaskMetricsRequests(task);
      expect(requests.length).toBeGreaterThan(0);
      requests.forEach(({ config }) => {
        expect(config).not.toBeFalsy();
        if (config && config.headers) {
          expect(config.headers['X-Telemetry-Sender']).toEqual('async');
        }
      });
    });
  });

  async function mockAndScheduleDetectionRulesTask(): Promise<SecurityTelemetryTask> {
    const task = getTelemetryTask(tasks, 'security:telemetry-detection-rules');

    // create some data
    await createMockedAlert(
      kibanaServer.coreStart.elasticsearch.client.asInternalUser,
      kibanaServer.coreStart.savedObjects
    );
    const { exceptionList, exceptionListItem } = await createMockedExceptionList(
      kibanaServer.coreStart.savedObjects
    );

    exceptionsList.push(exceptionList);
    exceptionsListItem.push(exceptionListItem);

    // schedule task to run ASAP
    await eventually(async () => {
      await taskManagerPlugin.runSoon(task.getTaskId());
    });

    return task;
  }

  function mockAxiosGet(bufferConfig: unknown = fakeBufferAndSizesConfigAsyncDisabled) {
    mockedAxiosGet.mockImplementation(async (url: string) => {
      if (url.startsWith(ENDPOINT_STAGING) && url.endsWith('ping')) {
        return { status: 200 };
      } else if (url.indexOf('kibana/manifest/artifacts') !== -1) {
        return {
          status: 200,
          data: 'x-pack/plugins/security_solution/server/lib/telemetry/__mocks__/kibana-artifacts.zip',
        };
      } else if (url.indexOf('telemetry-buffer-and-batch-sizes-v1') !== -1) {
        return {
          status: 200,
          data: bufferConfig,
        };
      }
      return { status: 404 };
    });
  }

  async function getTaskMetricsRequests(task: SecurityTelemetryTask): Promise<
    Array<{
      url: string;
      body: string;
      config: AxiosRequestConfig<unknown> | undefined;
    }>
  > {
    return eventually(
      async () => {
        const calls = mockedAxiosPost.mock.calls.flatMap(([url, data, config]) => {
          return (data as string).split('\n').map((body) => {
            return { url, body, config };
          });
        });

        const requests = calls.filter(({ url, body: b }) => {
          return (
            b.indexOf(getTelemetryTaskTitle(task)) !== -1 &&
            url.startsWith(ENDPOINT_STAGING) &&
            url.endsWith('task-metrics')
          );
        });
        expect(requests.length).toBeGreaterThan(0);
        return requests;
      },
      60 * 1_000,
      1_000
    );
  }
});

const fakeBufferAndSizesConfigAsyncDisabled = {
  telemetry_max_buffer_size: 100,
  max_security_list_telemetry_batch: 100,
  max_endpoint_telemetry_batch: 300,
  max_detection_rule_telemetry_batch: 1000,
  max_detection_alerts_batch: 50,
};

const fakeBufferAndSizesConfigAsyncEnabled = {
  ...fakeBufferAndSizesConfigAsyncDisabled,
  use_async_sender: true,
};
