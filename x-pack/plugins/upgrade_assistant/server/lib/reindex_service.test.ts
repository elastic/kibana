/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment = require('moment');
import { SavedObjectsClient } from 'src/server/saved_objects';
import {
  LOCK_WINDOW,
  REINDEX_OP_TYPE,
  ReindexSavedObject,
  ReindexService,
  reindexServiceFactory,
  ReindexStatus,
  ReindexStep,
} from './reindex_service';

describe('reindexService', () => {
  let savedObjectClient: jest.Mocked<SavedObjectsClient>;
  let callCluster: jest.Mock;
  let service: ReindexService;

  beforeEach(() => {
    savedObjectClient = {
      errors: null,
      create: jest.fn(),
      bulkCreate: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      bulkGet: jest.fn(),
      get: jest.fn(),
      // Fake update implementation that simply resolves to whatever the update says.
      update: jest.fn((type: string, id: string, attributes: object) =>
        Promise.resolve({ id, attributes } as ReindexSavedObject)
      ) as any,
    };
    callCluster = jest.fn();
    service = reindexServiceFactory(savedObjectClient, callCluster);
  });

  describe('createReindexOperation', () => {
    it('creates new reindex operation', async () => {
      callCluster.mockResolvedValue(true);
      savedObjectClient.find.mockResolvedValue({ total: 0 });

      await service.createReindexOperation('myIndex');
      expect(savedObjectClient.create).toHaveBeenCalledWith(REINDEX_OP_TYPE, {
        indexName: 'myIndex',
        newIndexName: 'myIndex-updated',
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
      });
    });

    it('fails if index does not exist', async () => {
      callCluster.mockResolvedValue(false);
      expect(service.createReindexOperation('myIndex')).rejects.toThrow();
      expect(savedObjectClient.create).not.toHaveBeenCalled();
    });

    it('deletes existing operation if it failed', async () => {
      callCluster.mockResolvedValue(true);
      savedObjectClient.find.mockResolvedValue({
        saved_objects: [{ id: 1, attributes: { status: ReindexStatus.failed } }],
        total: 1,
      });

      await service.createReindexOperation('myIndex');
      expect(savedObjectClient.delete).toHaveBeenCalledWith(REINDEX_OP_TYPE, 1);
    });

    it('fails if existing operation did not fail', async () => {
      callCluster.mockResolvedValue(true);
      savedObjectClient.find.mockResolvedValue({
        saved_objects: [{ id: 1, attributes: { status: ReindexStatus.inProgress } }],
        total: 1,
      });

      expect(service.createReindexOperation('myIndex')).rejects.toThrow();
      expect(savedObjectClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('findReindexOperation', () => {
    it('returns the only result', () => {
      savedObjectClient.find.mockResolvedValue({ total: 1, saved_objects: ['fake object'] });
      expect(service.findReindexOperation('myIndex')).resolves.toEqual('fake object');
      expect(savedObjectClient.find).toHaveBeenCalledWith({
        type: REINDEX_OP_TYPE,
        search: `"myIndex"`,
        searchFields: ['indexName'],
      });
    });

    it('fails if there are no results', () => {
      savedObjectClient.find.mockResolvedValue({ total: 0 });
      expect(service.findReindexOperation('myIndex')).rejects.toThrow();
    });

    it('fails if there is more than 1 result', () => {
      savedObjectClient.find.mockResolvedValue({ total: 2 });
      expect(service.findReindexOperation('myIndex')).rejects.toThrow();
    });
  });

  describe('findAllInProgressOperations', () => {
    it('returns raw results', () => {
      savedObjectClient.find.mockResolvedValue('results!');
      expect(service.findAllInProgressOperations()).resolves.toEqual('results!');
      expect(savedObjectClient.find).toHaveBeenCalledWith({
        type: REINDEX_OP_TYPE,
        search: '0',
        searchFields: ['status'],
      });
    });
  });

  describe('processNextStep', () => {
    describe('locking', () => {
      // These tests depend on an implementation detail that if no status is set, the state machine
      // is not activated, just the locking mechanism.

      it('locks and unlocks if object is unlocked', async () => {
        const reindexOp = { id: '1', attributes: { locked: null } } as ReindexSavedObject;
        await service.processNextStep(reindexOp);

        // Locked and then unlocked
        expect(savedObjectClient.update.mock.calls).toHaveLength(2);
        const firstUpdateAttributes = savedObjectClient.update.mock.calls[0][2];
        expect(firstUpdateAttributes.locked).not.toBeNull();
        const secondUpdateAttributes = savedObjectClient.update.mock.calls[1][2];
        expect(secondUpdateAttributes.locked).toBeNull();
      });

      it('locks and unlocks if object lock has expired', async () => {
        const reindexOp = {
          id: '1',
          attributes: {
            // Set locked timestamp to timeout + 10 seconds ago
            locked: moment()
              .subtract(LOCK_WINDOW)
              .subtract(moment.duration(10, 'seconds'))
              .format(),
          },
        } as ReindexSavedObject;
        await service.processNextStep(reindexOp);

        // Locked and then unlocked
        expect(savedObjectClient.update.mock.calls).toHaveLength(2);
        const firstUpdateAttributes = savedObjectClient.update.mock.calls[0][2];
        expect(firstUpdateAttributes.locked).not.toBeNull();
        const secondUpdateAttributes = savedObjectClient.update.mock.calls[1][2];
        expect(secondUpdateAttributes.locked).toBeNull();
      });

      it('throws if object is locked', () => {
        const reindexOp = {
          id: '1',
          attributes: { locked: moment().format() },
        } as ReindexSavedObject;
        expect(service.processNextStep(reindexOp)).rejects.toThrow();
        expect(savedObjectClient.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('state machine, lastCompletedStep ===', () => {
    const defaultAttributes = {
      indexName: 'myIndex',
      newIndexName: 'myIndex-updated',
    };

    describe('created', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.created },
      } as ReindexSavedObject;

      it('blocks writes and updates lastCompletedStep', async () => {
        callCluster.mockResolvedValue({ acknowledged: true });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.readonly);
        expect(callCluster).toHaveBeenCalledWith('indices.putSettings', {
          index: 'myIndex',
          body: { 'index.blocks.write': true },
        });
      });

      it('fails if setting updates are not acknowledged', async () => {
        callCluster.mockResolvedValue({ acknowledged: false });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
      });

      it('fails if setting updates fail', async () => {
        callCluster.mockRejectedValue(new Error('blah!'));
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
      });
    });

    describe('readonly', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.readonly },
      } as ReindexSavedObject;
      const settingsMappings = {
        settings: { 'index.number_of_replicas': 7, 'index.blocks.write': true },
        mappings: { _doc: { properties: { timestampl: { type: 'date' } } } },
      };

      // The more intricate details of how the settings are chosen are test separately.
      it('creates new index with settings and mappings and updates lastCompletedStep', async () => {
        callCluster
          .mockResolvedValueOnce({ myIndex: settingsMappings })
          .mockResolvedValueOnce({ acknowledged: true });

        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.newIndexCreated);
        expect(callCluster).toHaveBeenCalledWith('indices.create', {
          index: 'myIndex-updated',
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
          .mockRejectedValueOnce(new Error(`blah!`));
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.readonly);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
      });
    });

    describe('newIndexCreated', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.newIndexCreated },
      } as ReindexSavedObject;

      it('starts reindex, saves taskId, and updates lastCompletedStep', async () => {
        callCluster.mockResolvedValue({ task: 'xyz' });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
        expect(updatedOp.attributes.reindexTaskId).toEqual('xyz');
        expect(updatedOp.attributes.reindexTaskPercComplete).toEqual(0);
        expect(callCluster).toHaveBeenCalledWith('reindex', {
          refresh: true,
          waitForCompletion: false,
          body: {
            source: { index: 'myIndex' },
            dest: { index: 'myIndex-updated' },
          },
        });
      });

      it('fails if starting reindex fails', async () => {
        callCluster.mockRejectedValue(new Error('blah!'));
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
          callCluster.mockResolvedValue({
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

        it('fails if docs created is less than total docs', async () => {
          callCluster.mockResolvedValueOnce({
            completed: true,
            task: { status: { created: 95, total: 100 } },
          });
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
        callCluster.mockResolvedValue({ acknowledged: true });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.completed);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
        expect(callCluster).toHaveBeenCalledWith('indices.updateAliases', {
          body: {
            actions: [
              { add: { index: 'myIndex-updated', alias: 'myIndex' } },
              { remove_index: { index: 'myIndex' } },
            ],
          },
        });
      });

      it('fails if switching aliases is not acknowledged', async () => {
        callCluster.mockResolvedValue({ acknowledged: false });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexCompleted);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
      });

      it('fails if switching aliases fails', async () => {
        callCluster.mockRejectedValue(new Error('blah!'));
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexCompleted);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
      });
    });
  });
});
