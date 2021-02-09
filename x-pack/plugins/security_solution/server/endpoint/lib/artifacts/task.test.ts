/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '../../../../../task_manager/server/mocks';
import { TaskStatus } from '../../../../../task_manager/server';

import { createMockEndpointAppContext } from '../../mocks';

import { ManifestTaskConstants, ManifestTask } from './task';
import { MockManifestTask } from './task.mock';
import { ManifestManager } from '../../services/artifacts/manifest_manager';
import { buildManifestManagerMock } from '../../services/artifacts/manifest_manager/manifest_manager.mock';
import { InternalArtifactCompleteSchema } from '../../schemas/artifacts';
import { getMockArtifacts } from './mocks';
import { Manifest } from './manifest';

describe('task', () => {
  const MOCK_TASK_INSTANCE = {
    id: `${ManifestTaskConstants.TYPE}:1.0.0`,
    runAt: new Date(),
    attempts: 0,
    ownerId: '',
    status: TaskStatus.Running,
    startedAt: new Date(),
    scheduledAt: new Date(),
    retryAt: new Date(),
    params: {},
    state: {},
    taskType: ManifestTaskConstants.TYPE,
  };

  describe('Periodic task sanity checks', () => {
    test('can create task', () => {
      const manifestTask = new ManifestTask({
        endpointAppContext: createMockEndpointAppContext(),
        taskManager: taskManagerMock.createSetup(),
      });
      expect(manifestTask).toBeInstanceOf(ManifestTask);
    });

    test('task should be registered', () => {
      const mockTaskManager = taskManagerMock.createSetup();
      new ManifestTask({
        endpointAppContext: createMockEndpointAppContext(),
        taskManager: mockTaskManager,
      });
      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalled();
    });

    test('task should be scheduled', async () => {
      const mockTaskManagerSetup = taskManagerMock.createSetup();
      const manifestTask = new ManifestTask({
        endpointAppContext: createMockEndpointAppContext(),
        taskManager: mockTaskManagerSetup,
      });
      const mockTaskManagerStart = taskManagerMock.createStart();
      await manifestTask.start({ taskManager: mockTaskManagerStart });
      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
    });

    test('task should run', async () => {
      const mockContext = createMockEndpointAppContext();
      const mockTaskManager = taskManagerMock.createSetup();
      const mockManifestTask = new MockManifestTask({
        endpointAppContext: mockContext,
        taskManager: mockTaskManager,
      });
      const createTaskRunner =
        mockTaskManager.registerTaskDefinitions.mock.calls[0][0][ManifestTaskConstants.TYPE]
          .createTaskRunner;
      const taskRunner = createTaskRunner({ taskInstance: MOCK_TASK_INSTANCE });
      await taskRunner.run();
      expect(mockManifestTask.runTask).toHaveBeenCalled();
    });
  });

  describe('Artifacts generation flow tests', () => {
    const runTask = async (manifestManager: ManifestManager) => {
      const mockContext = createMockEndpointAppContext();
      const mockTaskManager = taskManagerMock.createSetup();

      new ManifestTask({
        endpointAppContext: mockContext,
        taskManager: mockTaskManager,
      });

      mockContext.service.getManifestManager = jest.fn().mockReturnValue(manifestManager);

      const createTaskRunner =
        mockTaskManager.registerTaskDefinitions.mock.calls[0][0][ManifestTaskConstants.TYPE]
          .createTaskRunner;
      const taskRunner = createTaskRunner({ taskInstance: MOCK_TASK_INSTANCE });
      await taskRunner.run();
    };

    const TEST_POLICY_ID_1 = 'c6d16e42-c32d-4dce-8a88-113cfe276ad1';
    const TEST_POLICY_ID_2 = '93c46720-c217-11ea-9906-b5b8a21b268e';
    const ARTIFACT_ID_1 =
      'endpoint-exceptionlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
    let ARTIFACT_EXCEPTIONS_MACOS: InternalArtifactCompleteSchema;
    let ARTIFACT_EXCEPTIONS_WINDOWS: InternalArtifactCompleteSchema;
    let ARTIFACT_TRUSTED_APPS_MACOS: InternalArtifactCompleteSchema;

    beforeAll(async () => {
      const artifacts = await getMockArtifacts({ compress: true });
      ARTIFACT_EXCEPTIONS_MACOS = artifacts[0];
      ARTIFACT_EXCEPTIONS_WINDOWS = artifacts[1];
      ARTIFACT_TRUSTED_APPS_MACOS = artifacts[2];
    });

    test('Should not run the process when no current manifest manager', async () => {
      const manifestManager = buildManifestManagerMock();

      manifestManager.getLastComputedManifest = jest.fn().mockReturnValue(null);

      await runTask(manifestManager);

      expect(manifestManager.getLastComputedManifest).toHaveBeenCalled();
      expect(manifestManager.buildNewManifest).not.toHaveBeenCalled();
      expect(manifestManager.pushArtifacts).not.toHaveBeenCalled();
      expect(manifestManager.commit).not.toHaveBeenCalled();
      expect(manifestManager.tryDispatch).not.toHaveBeenCalled();
      expect(manifestManager.deleteArtifacts).not.toHaveBeenCalled();
    });

    test('Should stop the process when no building new manifest throws error', async () => {
      const manifestManager = buildManifestManagerMock();
      const lastManifest = Manifest.getDefault();

      manifestManager.getLastComputedManifest = jest.fn().mockReturnValue(lastManifest);
      manifestManager.buildNewManifest = jest.fn().mockRejectedValue(new Error());

      await runTask(manifestManager);

      expect(manifestManager.getLastComputedManifest).toHaveBeenCalled();
      expect(manifestManager.buildNewManifest).toHaveBeenCalledWith(lastManifest);
      expect(manifestManager.pushArtifacts).not.toHaveBeenCalled();
      expect(manifestManager.commit).not.toHaveBeenCalled();
      expect(manifestManager.tryDispatch).not.toHaveBeenCalled();
      expect(manifestManager.deleteArtifacts).not.toHaveBeenCalled();
    });

    test('Should not bump version and commit manifest when no diff in the manifest', async () => {
      const manifestManager = buildManifestManagerMock();

      const lastManifest = Manifest.getDefault();
      lastManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      lastManifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS);

      const newManifest = Manifest.getDefault();
      newManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      newManifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS);

      manifestManager.getLastComputedManifest = jest.fn().mockReturnValue(lastManifest);
      manifestManager.buildNewManifest = jest.fn().mockResolvedValue(newManifest);
      manifestManager.pushArtifacts = jest.fn().mockResolvedValue([]);
      manifestManager.tryDispatch = jest.fn().mockResolvedValue([]);
      manifestManager.deleteArtifacts = jest.fn().mockResolvedValue([]);

      await runTask(manifestManager);

      expect(newManifest.getSemanticVersion()).toBe('1.0.0');

      expect(manifestManager.getLastComputedManifest).toHaveBeenCalled();
      expect(manifestManager.buildNewManifest).toHaveBeenCalledWith(lastManifest);
      expect(manifestManager.pushArtifacts).toHaveBeenCalledWith([]);
      expect(manifestManager.commit).not.toHaveBeenCalled();
      expect(manifestManager.tryDispatch).toHaveBeenCalledWith(newManifest);
      expect(manifestManager.deleteArtifacts).toHaveBeenCalledWith([]);
    });

    test('Should stop the process when there are errors pushing new artifacts', async () => {
      const manifestManager = buildManifestManagerMock();

      const lastManifest = Manifest.getDefault();

      const newManifest = Manifest.getDefault();
      newManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      newManifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS);

      manifestManager.getLastComputedManifest = jest.fn().mockReturnValue(lastManifest);
      manifestManager.buildNewManifest = jest.fn().mockResolvedValue(newManifest);
      manifestManager.pushArtifacts = jest.fn().mockResolvedValue([new Error()]);

      await runTask(manifestManager);

      expect(newManifest.getSemanticVersion()).toBe('1.0.0');

      expect(manifestManager.getLastComputedManifest).toHaveBeenCalled();
      expect(manifestManager.buildNewManifest).toHaveBeenCalledWith(lastManifest);
      expect(manifestManager.pushArtifacts).toHaveBeenCalledWith([
        ARTIFACT_EXCEPTIONS_MACOS,
        ARTIFACT_TRUSTED_APPS_MACOS,
      ]);
      expect(manifestManager.commit).not.toHaveBeenCalled();
      expect(manifestManager.tryDispatch).not.toHaveBeenCalled();
      expect(manifestManager.deleteArtifacts).not.toHaveBeenCalled();
    });

    test('Should stop the process when there are errors committing manifest', async () => {
      const manifestManager = buildManifestManagerMock();

      const lastManifest = Manifest.getDefault();

      const newManifest = Manifest.getDefault();
      newManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      newManifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS);

      manifestManager.getLastComputedManifest = jest.fn().mockReturnValue(lastManifest);
      manifestManager.buildNewManifest = jest.fn().mockResolvedValue(newManifest);
      manifestManager.pushArtifacts = jest.fn().mockResolvedValue([]);
      manifestManager.commit = jest.fn().mockRejectedValue(new Error());

      await runTask(manifestManager);

      expect(newManifest.getSemanticVersion()).toBe('1.0.1');

      expect(manifestManager.getLastComputedManifest).toHaveBeenCalled();
      expect(manifestManager.buildNewManifest).toHaveBeenCalledWith(lastManifest);
      expect(manifestManager.pushArtifacts).toHaveBeenCalledWith([
        ARTIFACT_EXCEPTIONS_MACOS,
        ARTIFACT_TRUSTED_APPS_MACOS,
      ]);
      expect(manifestManager.commit).toHaveBeenCalledWith(newManifest);
      expect(manifestManager.tryDispatch).not.toHaveBeenCalled();
      expect(manifestManager.deleteArtifacts).not.toHaveBeenCalled();
    });

    test('Should stop the process when there are errors dispatching manifest', async () => {
      const manifestManager = buildManifestManagerMock();

      const lastManifest = Manifest.getDefault();

      const newManifest = Manifest.getDefault();
      newManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      newManifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS);

      manifestManager.getLastComputedManifest = jest.fn().mockReturnValue(lastManifest);
      manifestManager.buildNewManifest = jest.fn().mockResolvedValue(newManifest);
      manifestManager.pushArtifacts = jest.fn().mockResolvedValue([]);
      manifestManager.commit = jest.fn().mockResolvedValue(null);
      manifestManager.tryDispatch = jest.fn().mockResolvedValue([new Error()]);

      await runTask(manifestManager);

      expect(newManifest.getSemanticVersion()).toBe('1.0.1');

      expect(manifestManager.getLastComputedManifest).toHaveBeenCalled();
      expect(manifestManager.buildNewManifest).toHaveBeenCalledWith(lastManifest);
      expect(manifestManager.pushArtifacts).toHaveBeenCalledWith([
        ARTIFACT_EXCEPTIONS_MACOS,
        ARTIFACT_TRUSTED_APPS_MACOS,
      ]);
      expect(manifestManager.commit).toHaveBeenCalledWith(newManifest);
      expect(manifestManager.tryDispatch).toHaveBeenCalledWith(newManifest);
      expect(manifestManager.deleteArtifacts).not.toHaveBeenCalled();
    });

    test('Should succeed the process and delete old artifacts', async () => {
      const manifestManager = buildManifestManagerMock();

      const lastManifest = Manifest.getDefault();
      lastManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      lastManifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS);

      const newManifest = Manifest.getDefault();
      newManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      newManifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS);

      manifestManager.getLastComputedManifest = jest.fn().mockReturnValue(lastManifest);
      manifestManager.buildNewManifest = jest.fn().mockResolvedValue(newManifest);
      manifestManager.pushArtifacts = jest.fn().mockResolvedValue([]);
      manifestManager.commit = jest.fn().mockResolvedValue(null);
      manifestManager.tryDispatch = jest.fn().mockResolvedValue([]);
      manifestManager.deleteArtifacts = jest.fn().mockResolvedValue([]);

      await runTask(manifestManager);

      expect(newManifest.getSemanticVersion()).toBe('1.0.1');

      expect(manifestManager.getLastComputedManifest).toHaveBeenCalled();
      expect(manifestManager.buildNewManifest).toHaveBeenCalledWith(lastManifest);
      expect(manifestManager.pushArtifacts).toHaveBeenCalledWith([ARTIFACT_TRUSTED_APPS_MACOS]);
      expect(manifestManager.commit).toHaveBeenCalledWith(newManifest);
      expect(manifestManager.tryDispatch).toHaveBeenCalledWith(newManifest);
      expect(manifestManager.deleteArtifacts).toHaveBeenCalledWith([ARTIFACT_ID_1]);
    });

    test('Should succeed the process but not add or delete artifacts when there are only transitions', async () => {
      const manifestManager = buildManifestManagerMock();

      const lastManifest = Manifest.getDefault();
      lastManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      lastManifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);

      const newManifest = Manifest.getDefault();
      newManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      newManifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);

      manifestManager.getLastComputedManifest = jest.fn().mockReturnValue(lastManifest);
      manifestManager.buildNewManifest = jest.fn().mockResolvedValue(newManifest);
      manifestManager.pushArtifacts = jest.fn().mockResolvedValue([]);
      manifestManager.commit = jest.fn().mockResolvedValue(null);
      manifestManager.tryDispatch = jest.fn().mockResolvedValue([]);
      manifestManager.deleteArtifacts = jest.fn().mockResolvedValue([]);

      await runTask(manifestManager);

      expect(newManifest.getSemanticVersion()).toBe('1.0.1');

      expect(manifestManager.getLastComputedManifest).toHaveBeenCalled();
      expect(manifestManager.buildNewManifest).toHaveBeenCalledWith(lastManifest);
      expect(manifestManager.pushArtifacts).toHaveBeenCalledWith([]);
      expect(manifestManager.commit).toHaveBeenCalledWith(newManifest);
      expect(manifestManager.tryDispatch).toHaveBeenCalledWith(newManifest);
      expect(manifestManager.deleteArtifacts).toHaveBeenCalledWith([]);
    });
  });
});
