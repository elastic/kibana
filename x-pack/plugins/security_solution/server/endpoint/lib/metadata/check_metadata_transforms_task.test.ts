/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ApiResponse } from '@elastic/elasticsearch';
import { TransformGetTransformStatsResponse } from '@elastic/elasticsearch/api/types';
import {
  CheckMetadataTransformsTask,
  TYPE,
  VERSION,
  BASE_NEXT_ATTEMPT_DELAY,
} from './check_metadata_transforms_task';
import { createMockEndpointAppContext } from '../../mocks';
import { coreMock } from '../../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../../task_manager/server/mocks';
import { TaskManagerSetupContract, TaskStatus } from '../../../../../task_manager/server';
import { CoreSetup } from '../../../../../../../src/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ElasticsearchClientMock } from '../../../../../../../src/core/server/elasticsearch/client/mocks';
import { TRANSFORM_STATES } from '../../../../common/constants';
import { METADATA_TRANSFORMS_PATTERN } from '../../../../common/endpoint/constants';
import { RunResult } from '../../../../../task_manager/server/task';

const MOCK_TASK_INSTANCE = {
  id: `${TYPE}:${VERSION}`,
  runAt: new Date(),
  attempts: 0,
  ownerId: '',
  status: TaskStatus.Running,
  startedAt: new Date(),
  scheduledAt: new Date(),
  retryAt: new Date(),
  params: {},
  state: {},
  taskType: TYPE,
};
const failedTransformId = 'failing-transform';
const goodTransformId = 'good-transform';

describe('check metadata transforms task', () => {
  const { createSetup: coreSetupMock } = coreMock;
  const { createSetup: tmSetupMock, createStart: tmStartMock } = taskManagerMock;

  let mockTask: CheckMetadataTransformsTask;
  let mockCore: CoreSetup;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;
  beforeAll(() => {
    mockCore = coreSetupMock();
    mockTaskManagerSetup = tmSetupMock();
    mockTask = new CheckMetadataTransformsTask({
      endpointAppContext: createMockEndpointAppContext(),
      core: mockCore,
      taskManager: mockTaskManagerSetup,
    });
  });

  describe('task lifecycle', () => {
    it('should create task', () => {
      expect(mockTask).toBeInstanceOf(CheckMetadataTransformsTask);
    });

    it('should register task', () => {
      expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalled();
    });

    it('should schedule task', async () => {
      const mockTaskManagerStart = tmStartMock();
      await mockTask.start({ taskManager: mockTaskManagerStart });
      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
    });
  });

  describe('task logic', () => {
    let esClient: ElasticsearchClientMock;
    beforeEach(async () => {
      const [{ elasticsearch }] = await mockCore.getStartServices();
      esClient = elasticsearch.client.asInternalUser as ElasticsearchClientMock;
    });

    const runTask = async (taskInstance = MOCK_TASK_INSTANCE) => {
      const mockTaskManagerStart = tmStartMock();
      await mockTask.start({ taskManager: mockTaskManagerStart });
      const createTaskRunner =
        mockTaskManagerSetup.registerTaskDefinitions.mock.calls[0][0][TYPE].createTaskRunner;
      const taskRunner = createTaskRunner({ taskInstance });
      return taskRunner.run();
    };

    const buildFailedStatsResponse = () =>
      ({
        body: {
          transforms: [
            {
              id: goodTransformId,
              state: TRANSFORM_STATES.STARTED,
            },
            {
              id: failedTransformId,
              state: TRANSFORM_STATES.FAILED,
            },
          ],
        },
      } as unknown as ApiResponse<TransformGetTransformStatsResponse>);

    it('should stop task if transform stats response fails', async () => {
      esClient.transform.getTransformStats.mockRejectedValue({});
      await runTask();
      expect(esClient.transform.getTransformStats).toHaveBeenCalledWith({
        transform_id: METADATA_TRANSFORMS_PATTERN,
      });
      expect(esClient.transform.stopTransform).not.toHaveBeenCalled();
      expect(esClient.transform.startTransform).not.toHaveBeenCalled();
    });

    it('should attempt transform restart if failing state', async () => {
      const transformStatsResponseMock = buildFailedStatsResponse();
      esClient.transform.getTransformStats.mockResolvedValue(transformStatsResponseMock);

      const taskResponse = (await runTask()) as RunResult;

      expect(esClient.transform.getTransformStats).toHaveBeenCalledWith({
        transform_id: METADATA_TRANSFORMS_PATTERN,
      });
      expect(esClient.transform.stopTransform).toHaveBeenCalledWith({
        transform_id: failedTransformId,
        allow_no_match: true,
        wait_for_completion: true,
        force: true,
      });
      expect(esClient.transform.startTransform).toHaveBeenCalledWith({
        transform_id: failedTransformId,
      });
      expect(taskResponse?.state?.attempts).toEqual({
        [goodTransformId]: 0,
        [failedTransformId]: 0,
      });
    });

    it('should correctly track transform restart attempts', async () => {
      const transformStatsResponseMock = buildFailedStatsResponse();
      esClient.transform.getTransformStats.mockResolvedValue(transformStatsResponseMock);

      esClient.transform.stopTransform.mockRejectedValueOnce({});
      let taskResponse = (await runTask()) as RunResult;
      expect(taskResponse?.state?.attempts).toEqual({
        [goodTransformId]: 0,
        [failedTransformId]: 1,
      });

      esClient.transform.startTransform.mockRejectedValueOnce({});
      taskResponse = (await runTask({
        ...MOCK_TASK_INSTANCE,
        state: taskResponse.state,
      })) as RunResult;
      expect(taskResponse?.state?.attempts).toEqual({
        [goodTransformId]: 0,
        [failedTransformId]: 2,
      });

      taskResponse = (await runTask({
        ...MOCK_TASK_INSTANCE,
        state: taskResponse.state,
      })) as RunResult;
      expect(taskResponse?.state?.attempts).toEqual({
        [goodTransformId]: 0,
        [failedTransformId]: 0,
      });
    });

    it('should correctly back off subsequent restart attempts', async () => {
      let transformStatsResponseMock = buildFailedStatsResponse();
      esClient.transform.getTransformStats.mockResolvedValue(transformStatsResponseMock);

      esClient.transform.stopTransform.mockRejectedValueOnce({});
      let taskStartedAt = new Date();
      let taskResponse = (await runTask()) as RunResult;
      let delay = BASE_NEXT_ATTEMPT_DELAY * 60000;
      let expectedRunAt = taskStartedAt.getTime() + delay;
      expect(taskResponse?.runAt?.getTime()).toBeGreaterThanOrEqual(expectedRunAt);
      // we don't have the exact timestamp it uses so give a buffer
      let expectedRunAtUpperBound = expectedRunAt + 1000;
      expect(taskResponse?.runAt?.getTime()).toBeLessThanOrEqual(expectedRunAtUpperBound);

      esClient.transform.startTransform.mockRejectedValueOnce({});
      taskStartedAt = new Date();
      taskResponse = (await runTask({
        ...MOCK_TASK_INSTANCE,
        state: taskResponse.state,
      })) as RunResult;
      // should be exponential on second+ attempt
      delay = BASE_NEXT_ATTEMPT_DELAY ** 2 * 60000;
      expectedRunAt = taskStartedAt.getTime() + delay;
      expect(taskResponse?.runAt?.getTime()).toBeGreaterThanOrEqual(expectedRunAt);
      // we don't have the exact timestamp it uses so give a buffer
      expectedRunAtUpperBound = expectedRunAt + 1000;
      expect(taskResponse?.runAt?.getTime()).toBeLessThanOrEqual(expectedRunAtUpperBound);

      esClient.transform.stopTransform.mockRejectedValueOnce({});
      taskStartedAt = new Date();
      taskResponse = (await runTask({
        ...MOCK_TASK_INSTANCE,
        state: taskResponse.state,
      })) as RunResult;
      // should be exponential on second+ attempt
      delay = BASE_NEXT_ATTEMPT_DELAY ** 3 * 60000;
      expectedRunAt = taskStartedAt.getTime() + delay;
      expect(taskResponse?.runAt?.getTime()).toBeGreaterThanOrEqual(expectedRunAt);
      // we don't have the exact timestamp it uses so give a buffer
      expectedRunAtUpperBound = expectedRunAt + 1000;
      expect(taskResponse?.runAt?.getTime()).toBeLessThanOrEqual(expectedRunAtUpperBound);

      taskStartedAt = new Date();
      taskResponse = (await runTask({
        ...MOCK_TASK_INSTANCE,
        state: taskResponse.state,
      })) as RunResult;
      // back to base delay after success
      delay = BASE_NEXT_ATTEMPT_DELAY * 60000;
      expectedRunAt = taskStartedAt.getTime() + delay;
      expect(taskResponse?.runAt?.getTime()).toBeGreaterThanOrEqual(expectedRunAt);
      // we don't have the exact timestamp it uses so give a buffer
      expectedRunAtUpperBound = expectedRunAt + 1000;
      expect(taskResponse?.runAt?.getTime()).toBeLessThanOrEqual(expectedRunAtUpperBound);

      transformStatsResponseMock = {
        body: {
          transforms: [
            {
              id: goodTransformId,
              state: TRANSFORM_STATES.STARTED,
            },
            {
              id: failedTransformId,
              state: TRANSFORM_STATES.STARTED,
            },
          ],
        },
      } as unknown as ApiResponse<TransformGetTransformStatsResponse>;
      esClient.transform.getTransformStats.mockResolvedValue(transformStatsResponseMock);
      taskResponse = (await runTask({
        ...MOCK_TASK_INSTANCE,
        state: taskResponse.state,
      })) as RunResult;
      // no more explicit runAt after subsequent success
      expect(taskResponse?.runAt).toBeUndefined();
    });
  });
});
