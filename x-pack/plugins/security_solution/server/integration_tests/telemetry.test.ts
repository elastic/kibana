/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import axios from 'axios';

import { ENDPOINT_STAGING } from '@kbn/telemetry-plugin/common/constants';

import { eventually, setupTestServers, removeFile } from './lib/helpers';
import {
  createMockedAlert,
  getTelemetryTasks,
  getTelemetryTask,
  createMockedExceptionList,
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

    beforeAll(async () => {
      await removeFile(logFilePath);

      const servers = await setupTestServers(logFilePath);
      esServer = servers.esServer;
      kibanaServer = servers.kibanaServer;

      expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
      taskManagerPlugin = taskManagerStartSpy.mock.results[0].value;

      expect(telemetrySenderStartSpy).toHaveBeenCalledTimes(1);

      tasks = getTelemetryTasks(telemetrySenderStartSpy);
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

    afterEach(async () => {});

    it('shuld execute when scheduled', async () => {
      const task = getTelemetryTask(tasks, 'security:telemetry-detection-rules');

      // create some data
      await createMockedAlert(
        kibanaServer.coreStart.elasticsearch.client.asInternalUser,
        kibanaServer.coreStart.savedObjects
      );
      await createMockedExceptionList(kibanaServer.coreStart.savedObjects);

      // schedule task to roon ASAP
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
  });
});
