/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import {
  ReindexOperation,
  ReindexSavedObject,
  ReindexStatus,
  ReindexStep,
} from '../../../common/types';
import { ReindexService, reindexServiceFactory } from './reindex_service';

describe('reindexService', () => {
  let actions: jest.Mocked<any>;
  let callCluster: jest.Mock<CallCluster>;
  let service: ReindexService;

  const updateMockImpl = (reindexOp: ReindexSavedObject, attrs: Partial<ReindexOperation> = {}) =>
    Promise.resolve({
      ...reindexOp,
      attributes: { ...reindexOp.attributes, ...attrs },
    } as ReindexSavedObject);

  const unimplemented = (name: string) => () =>
    Promise.reject(`Mock function ${name} was not implemented!`);

  beforeEach(() => {
    actions = {
      createReindexOp: jest.fn(unimplemented('createReindexOp')),
      deleteReindexOp: jest.fn(unimplemented('deleteReindexOp')),
      updateReindexOp: jest.fn(updateMockImpl),
      runWhileLocked: jest.fn((reindexOp: any, func: any) => func(reindexOp)),
      findReindexOperations: jest.fn(unimplemented('findReindexOperations')),
      findAllByStatus: jest.fn(unimplemented('findAllInProgressOperations')),
      getFlatSettings: jest.fn(unimplemented('getFlatSettings')),
      cleanupChanges: jest.fn(),
      incrementMlReindexes: jest.fn(unimplemented('incrementMlReindexes')),
      decrementMlReindexes: jest.fn(unimplemented('decrementMlReindexes')),
      runWhileMlLocked: jest.fn(async (f: any) => f({ attributes: {} })),
    };
    callCluster = jest.fn();
    service = reindexServiceFactory(callCluster, actions);
  });

  describe('detectReindexWarnings', () => {
    it('fetches reindex warnings from flat settings', async () => {
      actions.getFlatSettings.mockResolvedValueOnce({
        settings: {},
        mappings: {
          properties: { https: { type: 'boolean' } },
        },
      });

      const reindexWarnings = await service.detectReindexWarnings('myIndex');
      expect(reindexWarnings).toEqual([]);
    });

    it('returns null if index does not exist', async () => {
      actions.getFlatSettings.mockResolvedValueOnce(null);
      const reindexWarnings = await service.detectReindexWarnings('myIndex');
      expect(reindexWarnings).toBeNull();
    });
  });

  describe('createReindexOperation', () => {
    it('creates new reindex operation', async () => {
      callCluster.mockResolvedValueOnce(true); // indices.exist
      actions.findReindexOperations.mockResolvedValueOnce({ total: 0 });
      actions.createReindexOp.mockResolvedValueOnce();

      await service.createReindexOperation('myIndex');

      expect(actions.createReindexOp).toHaveBeenCalledWith('myIndex');
    });

    it('fails if index does not exist', async () => {
      callCluster.mockResolvedValueOnce(false); // indices.exist
      await expect(service.createReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.createReindexOp).not.toHaveBeenCalled();
    });

    it('deletes existing operation if it failed', async () => {
      callCluster.mockResolvedValueOnce(true); // indices.exist
      actions.findReindexOperations.mockResolvedValueOnce({
        saved_objects: [{ id: 1, attributes: { status: ReindexStatus.failed } }],
        total: 1,
      });
      actions.deleteReindexOp.mockResolvedValueOnce();
      actions.createReindexOp.mockResolvedValueOnce();

      await service.createReindexOperation('myIndex');
      expect(actions.deleteReindexOp).toHaveBeenCalledWith({
        id: 1,
        attributes: { status: ReindexStatus.failed },
      });
    });

    it('fails if existing operation did not fail', async () => {
      callCluster.mockResolvedValueOnce(true); // indices.exist
      actions.findReindexOperations.mockResolvedValueOnce({
        saved_objects: [{ id: 1, attributes: { status: ReindexStatus.inProgress } }],
        total: 1,
      });

      await expect(service.createReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.deleteReindexOp).not.toHaveBeenCalled();
      expect(actions.createReindexOp).not.toHaveBeenCalled();
    });
  });

  describe('findReindexOperation', () => {
    it('returns the only result', async () => {
      actions.findReindexOperations.mockResolvedValue({ total: 1, saved_objects: ['fake object'] });
      await expect(service.findReindexOperation('myIndex')).resolves.toEqual('fake object');
    });

    it('returns null if there are no results', async () => {
      actions.findReindexOperations.mockResolvedValue({ total: 0 });
      await expect(service.findReindexOperation('myIndex')).resolves.toBeNull();
    });

    it('fails if there is more than 1 result', async () => {
      actions.findReindexOperations.mockResolvedValue({ total: 2 });
      await expect(service.findReindexOperation('myIndex')).rejects.toThrow();
    });
  });

  describe('processNextStep', () => {
    describe('locking', () => {
      // These tests depend on an implementation detail that if no status is set, the state machine
      // is not activated, just the locking mechanism.

      it('runs with runWhileLocked', async () => {
        const reindexOp = { id: '1', attributes: { locked: null } } as ReindexSavedObject;
        await service.processNextStep(reindexOp);

        expect(actions.runWhileLocked).toHaveBeenCalled();
      });
    });
  });

  describe('pauseReindexOperation', () => {
    it('runs with runWhileLocked', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce({
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.inProgress },
      });

      await service.pauseReindexOperation('myIndex');

      expect(actions.runWhileLocked).toHaveBeenCalled();
      findSpy.mockRestore();
    });

    it('sets the status to paused', async () => {
      const reindexOp = {
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.inProgress },
      } as ReindexSavedObject;
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(reindexOp);

      await expect(service.pauseReindexOperation('myIndex')).resolves.toEqual({
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.paused },
      });

      expect(findSpy).toHaveBeenCalledWith('myIndex');
      expect(actions.updateReindexOp).toHaveBeenCalledWith(reindexOp, {
        status: ReindexStatus.paused,
      });
      findSpy.mockRestore();
    });

    it('throws if reindexOp is not inProgress', async () => {
      const reindexOp = {
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.failed },
      } as ReindexSavedObject;
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(reindexOp);

      await expect(service.pauseReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.updateReindexOp).not.toHaveBeenCalled();
      findSpy.mockRestore();
    });

    it('throws in reindex operation does not exist', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(null);
      await expect(service.pauseReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.updateReindexOp).not.toHaveBeenCalled();
      findSpy.mockRestore();
    });
  });

  describe('resumeReindexOperation', () => {
    it('runs with runWhileLocked', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce({
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.paused },
      });

      await service.resumeReindexOperation('myIndex');

      expect(actions.runWhileLocked).toHaveBeenCalled();
      findSpy.mockRestore();
    });

    it('sets the status to inProgress', async () => {
      const reindexOp = {
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.paused },
      } as ReindexSavedObject;
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(reindexOp);

      await expect(service.resumeReindexOperation('myIndex')).resolves.toEqual({
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.inProgress },
      });

      expect(findSpy).toHaveBeenCalledWith('myIndex');
      expect(actions.updateReindexOp).toHaveBeenCalledWith(reindexOp, {
        status: ReindexStatus.inProgress,
      });
      findSpy.mockRestore();
    });

    it('throws if reindexOp is not inProgress', async () => {
      const reindexOp = {
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.failed },
      } as ReindexSavedObject;
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(reindexOp);

      await expect(service.resumeReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.updateReindexOp).not.toHaveBeenCalled();
      findSpy.mockRestore();
    });

    it('throws in reindex operation does not exist', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(null);
      await expect(service.resumeReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.updateReindexOp).not.toHaveBeenCalled();
      findSpy.mockRestore();
    });
  });

  describe('state machine, lastCompletedStep ===', () => {
    const defaultAttributes = {
      indexName: 'myIndex',
      newIndexName: 'myIndex-reindex-0',
      status: ReindexStatus.inProgress,
    };
    const settingsMappings = {
      settings: { 'index.number_of_replicas': 7, 'index.blocks.write': true },
      mappings: { _doc: { properties: { timestampl: { type: 'date' } } } },
    };

    describe('created', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.created },
      } as ReindexSavedObject;

      // ML
      const mlReindexOp = {
        id: '2',
        attributes: { ...reindexOp.attributes, indexName: '.ml-anomalies' },
      } as ReindexSavedObject;

      it('does nothing if index is not an ML index', async () => {
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.indexConsumersStopped);
        expect(actions.incrementMlReindexes).not.toHaveBeenCalled();
        expect(actions.runWhileMlLocked).not.toHaveBeenCalled();
        expect(callCluster).not.toHaveBeenCalled();
      });

      it('increments ML reindexes and calls ML stop endpoint', async () => {
        actions.incrementMlReindexes.mockResolvedValueOnce();
        actions.runWhileMlLocked.mockImplementationOnce(async (f: any) => f());
        callCluster
          // Mock call to /_nodes for version check
          .mockResolvedValueOnce({ nodes: { nodeX: { version: '6.7.0-alpha' } } })
          // Mock call to /_ml/set_upgrade_mode?enabled=true
          .mockResolvedValueOnce({ acknowledged: true });

        const updatedOp = await service.processNextStep(mlReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.indexConsumersStopped);
        expect(actions.incrementMlReindexes).toHaveBeenCalled();
        expect(actions.runWhileMlLocked).toHaveBeenCalled();
        expect(callCluster).toHaveBeenCalledWith('transport.request', {
          path: '/_ml/set_upgrade_mode?enabled=true',
          method: 'POST',
        });
      });

      it('fails if ML reindexes cannot be incremented', async () => {
        actions.incrementMlReindexes.mockRejectedValueOnce(new Error(`Can't lock!`));

        const updatedOp = await service.processNextStep(mlReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage!.includes(`Can't lock!`)).toBeTruthy();
        expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
          path: '/_ml/set_upgrade_mode?enabled=true',
          method: 'POST',
        });
      });

      it('fails if ML doc cannot be locked', async () => {
        actions.incrementMlReindexes.mockResolvedValueOnce();
        actions.runWhileMlLocked.mockRejectedValueOnce(new Error(`Can't lock!`));

        const updatedOp = await service.processNextStep(mlReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage!.includes(`Can't lock!`)).toBeTruthy();
        expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
          path: '/_ml/set_upgrade_mode?enabled=true',
          method: 'POST',
        });
      });

      it('fails if ML endpoint fails', async () => {
        actions.incrementMlReindexes.mockResolvedValueOnce();
        callCluster
          // Mock call to /_nodes for version check
          .mockResolvedValueOnce({ nodes: { nodeX: { version: '6.7.0' } } })
          // Mock call to /_ml/set_upgrade_mode?enabled=true
          .mockResolvedValueOnce({ acknowledged: false });

        const updatedOp = await service.processNextStep(mlReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage!.includes('Could not stop ML jobs')).toBeTruthy();
        expect(callCluster).toHaveBeenCalledWith('transport.request', {
          path: '/_ml/set_upgrade_mode?enabled=true',
          method: 'POST',
        });
      });

      it('fails if not all nodes have been upgraded to 6.7.0', async () => {
        actions.incrementMlReindexes.mockResolvedValueOnce();
        callCluster
          // Mock call to /_nodes for version check
          .mockResolvedValueOnce({ nodes: { nodeX: { version: '6.6.0' } } });

        const updatedOp = await service.processNextStep(mlReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(
          updatedOp.attributes.errorMessage!.includes('Some nodes are not on minimum version')
        ).toBeTruthy();
        // Should not have called ML endpoint at all
        expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
          path: '/_ml/set_upgrade_mode?enabled=true',
          method: 'POST',
        });
      });

      // Watcher
      const watcherReindexOp = {
        id: '2',
        attributes: { ...reindexOp.attributes, indexName: '.watches' },
      } as ReindexSavedObject;

      it('does nothing if index is not a watcher index', async () => {
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.indexConsumersStopped);
        expect(callCluster).not.toHaveBeenCalled();
      });

      it('calls watcher start endpoint', async () => {
        callCluster.mockResolvedValueOnce({ acknowledged: true });
        const updatedOp = await service.processNextStep(watcherReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.indexConsumersStopped);
        expect(callCluster).toHaveBeenCalledWith('transport.request', {
          path: '/_watcher/_stop',
          method: 'POST',
        });
      });

      it('fails if watcher start endpoint fails', async () => {
        callCluster.mockResolvedValueOnce({ acknowledged: false });
        const updatedOp = await service.processNextStep(watcherReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(callCluster).toHaveBeenCalledWith('transport.request', {
          path: '/_watcher/_stop',
          method: 'POST',
        });
      });

      it('fails if watcher start endpoint throws', async () => {
        callCluster.mockRejectedValueOnce(new Error('Whoops!'));
        const updatedOp = await service.processNextStep(watcherReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(callCluster).toHaveBeenCalledWith('transport.request', {
          path: '/_watcher/_stop',
          method: 'POST',
        });
      });
    });

    describe('indexConsumersStopped', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.indexConsumersStopped },
      } as ReindexSavedObject;

      it('blocks writes and updates lastCompletedStep', async () => {
        callCluster.mockResolvedValueOnce({ acknowledged: true });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.readonly);
        expect(callCluster).toHaveBeenCalledWith('indices.putSettings', {
          index: 'myIndex',
          body: { 'index.blocks.write': true },
        });
      });

      it('fails if setting updates are not acknowledged', async () => {
        callCluster.mockResolvedValueOnce({ acknowledged: false });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.indexConsumersStopped);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
      });

      it('fails if setting updates fail', async () => {
        callCluster.mockRejectedValueOnce(new Error('blah!'));
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.indexConsumersStopped);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
      });
    });

    describe('readonly', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.readonly },
      } as ReindexSavedObject;

      // The more intricate details of how the settings are chosen are test separately.
      it('creates new index with settings and mappings and updates lastCompletedStep', async () => {
        actions.getFlatSettings.mockResolvedValueOnce(settingsMappings);
        callCluster.mockResolvedValueOnce({ acknowledged: true }); // indices.create

        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.newIndexCreated);
        expect(callCluster).toHaveBeenCalledWith('indices.create', {
          index: 'myIndex-reindex-0',
          body: {
            // index.blocks.write should be removed from the settings for the new index.
            settings: { 'index.number_of_replicas': 7 },
            mappings: settingsMappings.mappings,
          },
        });
      });

      it('fails if create index is not acknowledged', async () => {
        callCluster
          .mockResolvedValueOnce({ myIndex: settingsMappings })
          .mockResolvedValueOnce({ acknowledged: false });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.readonly);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
      });

      it('fails if create index fails', async () => {
        callCluster
          .mockResolvedValueOnce({ myIndex: settingsMappings })
          .mockRejectedValueOnce(new Error(`blah!`))
          .mockResolvedValueOnce({ acknowledged: true });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.readonly);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();

        // Original index should have been set back to allow reads.
        expect(callCluster).toHaveBeenCalledWith('indices.putSettings', {
          index: 'myIndex',
          body: { 'index.blocks.write': false },
        });
      });
    });

    describe('newIndexCreated', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.newIndexCreated },
      } as ReindexSavedObject;

      it('starts reindex, saves taskId, and updates lastCompletedStep', async () => {
        callCluster.mockResolvedValueOnce({ task: 'xyz' }); // reindex
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
        expect(updatedOp.attributes.reindexTaskId).toEqual('xyz');
        expect(updatedOp.attributes.reindexTaskPercComplete).toEqual(0);
        expect(callCluster).toHaveBeenLastCalledWith('reindex', {
          refresh: true,
          waitForCompletion: false,
          body: {
            source: { index: 'myIndex' },
            dest: { index: 'myIndex-reindex-0' },
          },
        });
      });

      it('fails if starting reindex fails', async () => {
        callCluster.mockRejectedValueOnce(new Error('blah!')).mockResolvedValueOnce({});
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.newIndexCreated);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
      });
    });

    describe('reindexStarted', () => {
      const reindexOp = {
        id: '1',
        attributes: {
          ...defaultAttributes,
          lastCompletedStep: ReindexStep.reindexStarted,
          reindexTaskId: 'xyz',
        },
      } as ReindexSavedObject;

      describe('reindex task is not complete', () => {
        it('updates reindexTaskPercComplete', async () => {
          callCluster.mockResolvedValueOnce({
            completed: false,
            task: { status: { created: 10, total: 100 } },
          });
          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
          expect(updatedOp.attributes.reindexTaskPercComplete).toEqual(0.1); // 10 / 100 = 0.1
        });
      });

      describe('reindex task is complete', () => {
        it('deletes task, updates reindexTaskPercComplete, updates lastCompletedStep', async () => {
          callCluster
            .mockResolvedValueOnce({
              completed: true,
              task: { status: { created: 100, total: 100 } },
            })
            .mockResolvedValueOnce({ count: 100 })
            .mockResolvedValueOnce({ result: 'deleted' });

          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexCompleted);
          expect(updatedOp.attributes.reindexTaskPercComplete).toEqual(1);
          expect(callCluster).toHaveBeenCalledWith('delete', {
            index: '.tasks',
            type: 'task',
            id: 'xyz',
          });
        });

        it('fails if docs created is less than count in source index', async () => {
          callCluster
            .mockResolvedValueOnce({
              completed: true,
              task: { status: { created: 95, total: 95 } },
            })
            .mockReturnValueOnce({ count: 100 });

          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(updatedOp.attributes.errorMessage).not.toBeNull();
        });
      });
    });

    describe('reindexCompleted', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.reindexCompleted },
      } as ReindexSavedObject;

      it('switches aliases, sets as complete, and updates lastCompletedStep', async () => {
        callCluster
          .mockResolvedValueOnce({ myIndex: { aliases: {} } })
          .mockResolvedValueOnce({ acknowledged: true });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
        expect(callCluster).toHaveBeenCalledWith('indices.updateAliases', {
          body: {
            actions: [
              { add: { index: 'myIndex-reindex-0', alias: 'myIndex' } },
              { remove_index: { index: 'myIndex' } },
            ],
          },
        });
      });

      it('moves existing aliases over to new index', async () => {
        callCluster
          .mockResolvedValueOnce({
            myIndex: {
              aliases: {
                myAlias: {},
                myFilteredAlias: { filter: { term: { https: true } } },
              },
            },
          })
          .mockResolvedValueOnce({ acknowledged: true });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
        expect(callCluster).toHaveBeenCalledWith('indices.updateAliases', {
          body: {
            actions: [
              { add: { index: 'myIndex-reindex-0', alias: 'myIndex' } },
              { remove_index: { index: 'myIndex' } },
              { add: { index: 'myIndex-reindex-0', alias: 'myAlias' } },
              {
                add: {
                  index: 'myIndex-reindex-0',
                  alias: 'myFilteredAlias',
                  filter: { term: { https: true } },
                },
              },
            ],
          },
        });
      });

      it('fails if switching aliases is not acknowledged', async () => {
        callCluster.mockResolvedValueOnce({ acknowledged: false });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexCompleted);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
      });

      it('fails if switching aliases fails', async () => {
        callCluster.mockRejectedValueOnce(new Error('blah!'));
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexCompleted);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
      });
    });

    describe('aliasCreated', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.aliasCreated },
      } as ReindexSavedObject;

      // ML
      const mlReindexOp = {
        id: '2',
        attributes: { ...reindexOp.attributes, indexName: '.ml-anomalies' },
      } as ReindexSavedObject;

      it('does nothing if index is not an ML index', async () => {
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.indexConsumersStarted);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.completed);
        expect(callCluster).not.toHaveBeenCalled();
      });

      it('decrements ML reindexes and calls ML start endpoint if no remaining ML jobs', async () => {
        actions.decrementMlReindexes.mockResolvedValue();
        actions.runWhileMlLocked.mockImplementationOnce(async (f: any) =>
          f({ attributes: { mlReindexCount: 0 } })
        );
        // Mock call to /_ml/set_upgrade_mode?enabled=false
        callCluster.mockResolvedValueOnce({ acknowledged: true });

        const updatedOp = await service.processNextStep(mlReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.indexConsumersStarted);
        expect(callCluster).toHaveBeenCalledWith('transport.request', {
          path: '/_ml/set_upgrade_mode?enabled=false',
          method: 'POST',
        });
      });

      it('does not call ML start endpoint if there are remaining ML jobs', async () => {
        actions.decrementMlReindexes.mockResolvedValue();
        actions.runWhileMlLocked.mockImplementationOnce(async (f: any) =>
          f({ attributes: { mlReindexCount: 2 } })
        );
        // Mock call to /_ml/set_upgrade_mode?enabled=false
        callCluster.mockResolvedValueOnce({ acknowledged: true });

        const updatedOp = await service.processNextStep(mlReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.indexConsumersStarted);
        expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
          path: '/_ml/set_upgrade_mode?enabled=false',
          method: 'POST',
        });
      });

      it('fails if ML reindexes cannot be decremented', async () => {
        // Mock unable to lock ml doc
        actions.decrementMlReindexes.mockRejectedValue(new Error(`Can't lock!`));

        const updatedOp = await service.processNextStep(mlReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage!.includes(`Can't lock!`)).toBeTruthy();
        expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
          path: '/_ml/set_upgrade_mode?enabled=false',
          method: 'POST',
        });
      });

      it('fails if ML doc cannot be locked', async () => {
        actions.decrementMlReindexes.mockResolvedValue();
        // Mock unable to lock ml doc
        actions.runWhileMlLocked.mockRejectedValueOnce(new Error(`Can't lock!`));

        const updatedOp = await service.processNextStep(mlReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage!.includes(`Can't lock!`)).toBeTruthy();
        expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
          path: '/_ml/set_upgrade_mode?enabled=false',
          method: 'POST',
        });
      });

      it('fails if ML endpoint fails', async () => {
        actions.decrementMlReindexes.mockResolvedValue();
        actions.runWhileMlLocked.mockImplementationOnce(async (f: any) =>
          f({ attributes: { mlReindexCount: 0 } })
        );
        // Mock call to /_ml/set_upgrade_mode?enabled=true
        callCluster.mockResolvedValueOnce({ acknowledged: false });

        const updatedOp = await service.processNextStep(mlReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(
          updatedOp.attributes.errorMessage!.includes('Could not resume ML jobs')
        ).toBeTruthy();
        expect(callCluster).toHaveBeenCalledWith('transport.request', {
          path: '/_ml/set_upgrade_mode?enabled=false',
          method: 'POST',
        });
      });

      // Watcher
      const watcherReindexOp = {
        id: '2',
        attributes: { ...reindexOp.attributes, indexName: '.watches' },
      } as ReindexSavedObject;

      it('does nothing if index is not a watcher index', async () => {
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.indexConsumersStarted);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.completed);
        expect(callCluster).not.toHaveBeenCalled();
      });

      it('calls watcher start endpoint', async () => {
        callCluster.mockResolvedValueOnce({ acknowledged: true });
        const updatedOp = await service.processNextStep(watcherReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.indexConsumersStarted);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.completed);
        expect(callCluster).toHaveBeenCalledWith('transport.request', {
          path: '/_watcher/_start',
          method: 'POST',
        });
      });

      it('fails if watcher start endpoint fails', async () => {
        callCluster.mockResolvedValueOnce({ acknowledged: false });
        const updatedOp = await service.processNextStep(watcherReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(callCluster).toHaveBeenCalledWith('transport.request', {
          path: '/_watcher/_start',
          method: 'POST',
        });
      });

      it('fails if watcher start endpoint throws', async () => {
        callCluster.mockRejectedValueOnce(new Error('Whoops!'));
        const updatedOp = await service.processNextStep(watcherReindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(callCluster).toHaveBeenCalledWith('transport.request', {
          path: '/_watcher/_start',
          method: 'POST',
        });
      });
    });
  });
});
