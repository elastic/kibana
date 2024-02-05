/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import axios from 'axios';

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
  describe('detection-rules', () => {
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

    beforeEach(() => {
      jest.clearAllMocks();
      mockedAxiosGet.mockImplementation(async (url: string) => {
        if (url.startsWith(ENDPOINT_STAGING) && url.endsWith('ping')) {
          return { status: 200 };
        }
        return { status: 404 };
      });
      mockedAxiosPost.mockImplementation(async (url: string) => {
        return { status: 201 };
      });
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

    it('shuld execute when scheduled', async () => {
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

      // wait until the events are sent to the telemetry server
      const body = await eventually(
        async () => {
          const calls = mockedAxiosPost.mock.calls.flatMap(([url, data]) => {
            return (data as string).split('\n').map((b) => {
              return { url, body: b };
            });
          });

          const found = calls.find(({ url, body: b }) => {
            return (
              b.indexOf(getTelemetryTaskTitle(task)) !== -1 &&
              url.startsWith(ENDPOINT_STAGING) &&
              url.endsWith('task-metrics')
            );
          });
          expect(found).not.toBeFalsy();

          return found !== undefined ? found.body : '{}';
        },
        60 * 1_000,
        1_000
      );

      const asJson = JSON.parse(body);
      expect(asJson).not.toBeFalsy();
      expect(asJson.passed).toEqual(true);
    });
  });
});
