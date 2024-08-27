/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskStatus,
} from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  CONNECTOR_USAGE_REPORTING_MISSING_ID,
  CONNECTOR_USAGE_REPORTING_SOURCE_ID,
  CONNECTOR_USAGE_REPORTING_TASK_ID,
  CONNECTOR_USAGE_REPORTING_TASK_SCHEDULE,
  CONNECTOR_USAGE_REPORTING_TASK_TYPE,
  ConnectorUsageReportingTask,
  USAGE_API_URL,
} from './connector_usage_reporting_task';
import type { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import { ActionsPluginsStart } from '../plugin';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

jest.mock('axios');
const mockedAxiosPost = jest.spyOn(axios, 'post');

const nowStr = '2024-01-01T12:00:00.000Z';
const nowDate = new Date(nowStr);

jest.useFakeTimers();
jest.setSystemTime(nowDate.getTime());

describe('ConnectorUsageReportingTask', () => {
  const logger = loggingSystemMock.createLogger();
  const { createSetup } = coreMock;
  const { createSetup: taskManagerSetupMock, createStart: taskManagerStartMock } = taskManagerMock;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockCore: CoreSetup<ActionsPluginsStart>;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;
  let mockTaskManagerStart: jest.Mocked<TaskManagerStartContract>;

  beforeEach(async () => {
    mockTaskManagerSetup = taskManagerSetupMock();
    mockTaskManagerStart = taskManagerStartMock();
    mockCore = createSetup();
    mockEsClient = (await mockCore.getStartServices())[0].elasticsearch.client
      .asInternalUser as jest.Mocked<ElasticsearchClient>;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const createTaskRunner = async ({
    lastReportedUsageDate,
    projectId,
    attempts = 0,
  }: {
    lastReportedUsageDate: Date;
    projectId?: string;
    attempts?: number;
  }) => {
    const timestamp = new Date(new Date().setMinutes(-15));
    const task = new ConnectorUsageReportingTask({
      eventLogIndex: 'test-index',
      projectId,
      logger,
      core: mockCore,
      taskManager: mockTaskManagerSetup,
    });

    await task.start(mockTaskManagerStart);

    const createTaskRunnerFunction =
      mockTaskManagerSetup.registerTaskDefinitions.mock.calls[0][0][
        CONNECTOR_USAGE_REPORTING_TASK_TYPE
      ].createTaskRunner;

    return createTaskRunnerFunction({
      taskInstance: {
        id: CONNECTOR_USAGE_REPORTING_TASK_ID,
        runAt: timestamp,
        attempts: 0,
        ownerId: '',
        status: TaskStatus.Running,
        startedAt: timestamp,
        scheduledAt: timestamp,
        retryAt: null,
        params: {},
        state: {
          lastReportedUsageDate,
          attempts,
        },
        taskType: CONNECTOR_USAGE_REPORTING_TASK_TYPE,
      },
    });
  };

  it('registers the task', async () => {
    new ConnectorUsageReportingTask({
      eventLogIndex: 'test-index',
      projectId: 'test-projecr',
      logger,
      core: createSetup(),
      taskManager: mockTaskManagerSetup,
    });

    expect(mockTaskManagerSetup.registerTaskDefinitions).toBeCalledTimes(1);
    expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalledWith({
      [CONNECTOR_USAGE_REPORTING_TASK_TYPE]: {
        title: 'Connector usage reporting task',
        timeout: '1m',
        createTaskRunner: expect.any(Function),
      },
    });
  });

  it('schedules the task', async () => {
    const core = createSetup();
    const taskManagerStart = taskManagerStartMock();

    const task = new ConnectorUsageReportingTask({
      eventLogIndex: 'test-index',
      projectId: 'test-projecr',
      logger,
      core,
      taskManager: mockTaskManagerSetup,
    });

    await task.start(taskManagerStart);

    expect(taskManagerStart.ensureScheduled).toBeCalledTimes(1);
    expect(taskManagerStart.ensureScheduled).toHaveBeenCalledWith({
      id: CONNECTOR_USAGE_REPORTING_TASK_ID,
      taskType: CONNECTOR_USAGE_REPORTING_TASK_TYPE,
      schedule: {
        ...CONNECTOR_USAGE_REPORTING_TASK_SCHEDULE,
      },
      state: {},
      params: {},
    });
  });

  it('logs error if task manager is not ready', async () => {
    const core = createSetup();
    const taskManagerStart = taskManagerStartMock();

    const task = new ConnectorUsageReportingTask({
      eventLogIndex: 'test-index',
      projectId: 'test-projecr',
      logger,
      core,
      taskManager: mockTaskManagerSetup,
    });

    await task.start();

    expect(taskManagerStart.ensureScheduled).not.toBeCalled();
    expect(logger.error).toHaveBeenCalledWith(
      `missing required task manager service during start of ${CONNECTOR_USAGE_REPORTING_TASK_TYPE}`
    );
  });

  it('logs error if scheduling task fails', async () => {
    const core = createSetup();
    const taskManagerStart = taskManagerStartMock();
    taskManagerStart.ensureScheduled.mockRejectedValue(new Error('test'));

    const task = new ConnectorUsageReportingTask({
      eventLogIndex: 'test-index',
      projectId: 'test-projecr',
      logger,
      core,
      taskManager: mockTaskManagerSetup,
    });

    await task.start(taskManagerStart);

    expect(logger.error).toHaveBeenCalledWith(
      'Error scheduling task actions:connector_usage_reporting, received test'
    );
  });

  it('runs the task', async () => {
    mockEsClient.search.mockResolvedValueOnce({
      aggregations: { total_usage: 215 },
    } as SearchResponse<unknown, unknown>);

    mockedAxiosPost.mockResolvedValueOnce(200);

    const lastReportedUsageDateStr = '2024-01-01T00:00:00.000Z';
    const lastReportedUsageDate = new Date(lastReportedUsageDateStr);

    const taskRunner = await createTaskRunner({ lastReportedUsageDate, projectId: 'test-project' });

    const response = await taskRunner.run();

    const report = {
      creation_timestamp: nowStr,
      id: `connector-request-body-bytes-${lastReportedUsageDateStr}-${nowStr}`,
      source: {
        id: CONNECTOR_USAGE_REPORTING_SOURCE_ID,
        instance_group_id: 'test-project',
      },
      usage: {
        period_seconds: 43200,
        quantity: 0,
        type: 'connector_request_body_bytes',
      },
      usage_timestamp: nowStr,
    };

    expect(mockedAxiosPost).toHaveBeenCalledWith(USAGE_API_URL, report, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      httpsAgent: expect.any(Object),
    });

    expect(response).toEqual({
      state: {
        attempts: 0,
        lastReportedUsageDate: expect.any(Date),
      },
    });
  });

  it('re-runs the task when search for records fails', async () => {
    mockEsClient.search.mockRejectedValue(new Error('500'));

    mockedAxiosPost.mockResolvedValueOnce(200);

    const lastReportedUsageDate = new Date('2024-01-01T00:00:00.000Z');

    const taskRunner = await createTaskRunner({ lastReportedUsageDate, projectId: 'test-project' });

    const response = await taskRunner.run();

    expect(response).toEqual({
      state: {
        lastReportedUsageDate,
        attempts: 0,
      },
      runAt: nowDate,
    });
  });

  it('re-runs the task when it fails to push the usage record', async () => {
    mockEsClient.search.mockResolvedValueOnce({
      aggregations: { total_usage: 215 },
    } as SearchResponse<unknown, unknown>);

    mockedAxiosPost.mockRejectedValueOnce(500);

    const lastReportedUsageDate = new Date('2024-01-01T00:00:00.000Z');

    const taskRunner = await createTaskRunner({ lastReportedUsageDate, projectId: 'test-project' });

    const response = await taskRunner.run();

    expect(response).toEqual({
      state: {
        lastReportedUsageDate,
        attempts: 1,
      },
      runAt: new Date(nowDate.getTime() + 60000), // After a min
    });
  });

  it('stops retrying after 5 attempts', async () => {
    mockEsClient.search.mockResolvedValueOnce({
      aggregations: { total_usage: 215 },
    } as SearchResponse<unknown, unknown>);

    mockedAxiosPost.mockRejectedValueOnce(new Error('test-error'));

    const lastReportedUsageDate = new Date('2024-01-01T00:00:00.000Z');

    const taskRunner = await createTaskRunner({
      lastReportedUsageDate,
      projectId: 'test-project',
      attempts: 4,
    });

    const response = await taskRunner.run();

    expect(response).toEqual({
      state: {
        lastReportedUsageDate,
        attempts: 0,
      },
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Usage data could not be pushed to usage-api. Stopped retrying after 5 attempts. Error:test-error'
    );
  });

  it('logs a warning if the projectId is missing', async () => {
    mockEsClient.search.mockResolvedValueOnce({
      aggregations: { total_usage: 50 },
    } as SearchResponse<unknown, unknown>);

    mockedAxiosPost.mockResolvedValueOnce(200);

    const lastReportedUsageDateStr = '2024-01-01T00:00:00.000Z';
    const lastReportedUsageDate = new Date(lastReportedUsageDateStr);

    const taskRunner = await createTaskRunner({ lastReportedUsageDate, projectId: undefined });

    await taskRunner.run();

    const report = {
      creation_timestamp: nowStr,
      id: `connector-request-body-bytes-${lastReportedUsageDateStr}-${nowStr}`,
      source: {
        id: CONNECTOR_USAGE_REPORTING_SOURCE_ID,
        instance_group_id: CONNECTOR_USAGE_REPORTING_MISSING_ID,
      },
      usage: {
        period_seconds: 43200,
        quantity: 0,
        type: 'connector_request_body_bytes',
      },
      usage_timestamp: nowStr,
    };

    expect(mockedAxiosPost).toHaveBeenCalledWith(USAGE_API_URL, report, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      httpsAgent: expect.any(Object),
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'project id missing for records starting from 2024-01-01T12:00:00.000Z'
    );
  });
});
