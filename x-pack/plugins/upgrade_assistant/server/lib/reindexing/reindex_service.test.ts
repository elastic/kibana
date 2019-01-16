/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { SavedObjectsClient } from 'src/server/saved_objects';
import {
  REINDEX_OP_TYPE,
  ReindexSavedObject,
  ReindexStatus,
  ReindexStep,
  ReindexWarning,
} from '../../../common/types';
import { LOCK_WINDOW, ReindexService, reindexServiceFactory } from './reindex_service';

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

  describe('detectReindexWarnings', () => {
    it('fetches reindex warnings from flat settings', async () => {
      const mappingsWithWarnings = {
        settings: {},
        mappings: {
          _doc: {
            properties: { https: { type: 'boolean' } },
            _all: { enabled: true },
          },
        },
      };
      callCluster.mockResolvedValueOnce({ myIndex: mappingsWithWarnings });

      const reindexWarnings = await service.detectReindexWarnings('myIndex');
      expect(reindexWarnings).toEqual([ReindexWarning.allField, ReindexWarning.booleanFields]);
      expect(callCluster).toHaveBeenCalledWith('transport.request', {
        path: `/myIndex?flat_settings=true`,
      });
    });

    it('returns null if index does not exist', async () => {
      callCluster.mockResolvedValueOnce({});
      const reindexWarnings = await service.detectReindexWarnings('myIndex');
      expect(reindexWarnings).toBeNull();
    });
  });

  describe('createReindexOperation', () => {
    it('creates new reindex operation', async () => {
      callCluster.mockResolvedValueOnce(true);
      savedObjectClient.find.mockResolvedValueOnce({ total: 0 });
      callCluster.mockResolvedValueOnce(false);

      await service.createReindexOperation('myIndex');
      expect(savedObjectClient.create).toHaveBeenCalledWith(REINDEX_OP_TYPE, {
        indexName: 'myIndex',
        newIndexName: 'myIndex-reindex-0',
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
      });
    });

    it('fails if index does not exist', async () => {
      callCluster.mockResolvedValueOnce(false);
      await expect(service.createReindexOperation('myIndex')).rejects.toThrow();
      expect(savedObjectClient.create).not.toHaveBeenCalled();
    });

    it('deletes existing operation if it failed', async () => {
      callCluster.mockResolvedValueOnce(true);
      savedObjectClient.find.mockResolvedValueOnce({
        saved_objects: [{ id: 1, attributes: { status: ReindexStatus.failed } }],
        total: 1,
      });

      await service.createReindexOperation('myIndex');
      expect(savedObjectClient.delete).toHaveBeenCalledWith(REINDEX_OP_TYPE, 1);
    });

    it('fails if existing operation did not fail', async () => {
      callCluster.mockResolvedValueOnce(true);
      savedObjectClient.find.mockResolvedValueOnce({
        saved_objects: [{ id: 1, attributes: { status: ReindexStatus.inProgress } }],
        total: 1,
      });

      await expect(service.createReindexOperation('myIndex')).rejects.toThrow();
      expect(savedObjectClient.delete).not.toHaveBeenCalled();
    });

    it('generates fallback newIndexName if already exists', async () => {
      callCluster.mockResolvedValueOnce(true);
      savedObjectClient.find.mockResolvedValueOnce({ total: 0 });
      callCluster.mockResolvedValueOnce(true);
      callCluster.mockResolvedValueOnce(false);

      await service.createReindexOperation('myIndex');
      expect(savedObjectClient.create).toHaveBeenCalledWith(REINDEX_OP_TYPE, {
        indexName: 'myIndex',
        newIndexName: 'myIndex-reindex-1',
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
      });
    });

    it('fails if it cannot find a newIndexName that does not already exist', async () => {
      callCluster.mockResolvedValueOnce(true);
      savedObjectClient.find.mockResolvedValueOnce({
        saved_objects: [{ id: 1, attributes: { status: ReindexStatus.inProgress } }],
        total: 1,
      });
      callCluster.mockResolvedValue(true); // always return true

      await expect(service.createReindexOperation('myIndex')).rejects.toThrow();
      expect(savedObjectClient.create).not.toHaveBeenCalled();
    });
  });

  describe('findReindexOperation', () => {
    it('returns the only result', async () => {
      savedObjectClient.find.mockResolvedValue({ total: 1, saved_objects: ['fake object'] });
      await expect(service.findReindexOperation('myIndex')).resolves.toEqual('fake object');
      expect(savedObjectClient.find).toHaveBeenCalledWith({
        type: REINDEX_OP_TYPE,
        search: `"myIndex"`,
        searchFields: ['indexName'],
      });
    });

    it('returns null if there are no results', async () => {
      savedObjectClient.find.mockResolvedValue({ total: 0 });
      await expect(service.findReindexOperation('myIndex')).resolves.toBeNull();
    });

    it('fails if there is more than 1 result', async () => {
      savedObjectClient.find.mockResolvedValue({ total: 2 });
      await expect(service.findReindexOperation('myIndex')).rejects.toThrow();
    });
  });

  describe('findAllInProgressOperations', () => {
    it('returns raw results', async () => {
      savedObjectClient.find.mockResolvedValue('results!');
      await expect(service.findAllInProgressOperations()).resolves.toEqual('results!');
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

      it('throws if object is locked', async () => {
        const reindexOp = {
          id: '1',
          attributes: { locked: moment().format() },
        } as ReindexSavedObject;
        await expect(service.processNextStep(reindexOp)).rejects.toThrow();
        expect(savedObjectClient.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('state machine, lastCompletedStep ===', () => {
    const defaultAttributes = {
      indexName: 'myIndex',
      newIndexName: 'myIndex-reindex-0',
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
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
      });

      it('fails if setting updates fail', async () => {
        callCluster.mockRejectedValueOnce(new Error('blah!'));
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

      // The more intricate details of how the settings are chosen are test separately.
      it('creates new index with settings and mappings and updates lastCompletedStep', async () => {
        callCluster
          .mockResolvedValueOnce({ myIndex: settingsMappings })
          .mockResolvedValueOnce({ acknowledged: true });

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
        callCluster
          .mockResolvedValueOnce({ myIndex: { mappings: settingsMappings.mappings } })
          .mockResolvedValueOnce({ task: 'xyz' });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
        expect(updatedOp.attributes.reindexTaskId).toEqual('xyz');
        expect(updatedOp.attributes.reindexTaskPercComplete).toEqual(0);
        expect(callCluster).toHaveBeenCalledWith('indices.getMapping', {
          index: 'myIndex',
        });
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
        callCluster.mockRejectedValueOnce(new Error('blah!'));
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
        callCluster
          .mockResolvedValueOnce({ myIndex: { aliases: {} } })
          .mockResolvedValueOnce({ acknowledged: true });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.completed);
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
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.completed);
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
  });
});
