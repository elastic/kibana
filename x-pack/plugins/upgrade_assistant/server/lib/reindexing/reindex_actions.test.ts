/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment = require('moment');
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import {
  REINDEX_OP_TYPE,
  ReindexOperation,
  ReindexSavedObject,
  ReindexStatus,
  ReindexStep,
} from 'x-pack/plugins/upgrade_assistant/common/types';
import {
  LOCK_WINDOW,
  ML_LOCK_DOC_ID,
  ReindexActions,
  reindexActionsFactory,
} from './reindex_actions';

describe('ReindexActions', () => {
  let client: jest.Mocked<any>;
  let callCluster: jest.Mock<CallCluster>;
  let actions: ReindexActions;

  const unimplemented = (name: string) => () =>
    Promise.reject(`Mock function ${name} was not implemented!`);

  beforeEach(() => {
    client = {
      errors: null,
      create: jest.fn(unimplemented('create')),
      bulkCreate: jest.fn(unimplemented('bulkCreate')),
      delete: jest.fn(unimplemented('delete')),
      find: jest.fn(unimplemented('find')),
      bulkGet: jest.fn(unimplemented('bulkGet')),
      get: jest.fn(unimplemented('get')),
      // Fake update implementation that simply resolves to whatever the update says.
      update: jest.fn((type: string, id: string, attributes: object) =>
        Promise.resolve({ id, attributes } as ReindexSavedObject)
      ) as any,
    };
    callCluster = jest.fn();
    actions = reindexActionsFactory(client, callCluster);
  });

  describe('createReindexOp', () => {
    beforeEach(() => client.create.mockResolvedValue());

    it('generates fallback newIndexName if already exists', async () => {
      callCluster
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await actions.createReindexOp('myIndex');
      expect(client.create).toHaveBeenCalledWith(REINDEX_OP_TYPE, {
        indexName: 'myIndex',
        newIndexName: 'myIndex-reindex-2',
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
        mlReindexCount: null,
      });
    });

    it('fails if it cannot find a newIndexName that does not already exist', async () => {
      callCluster.mockResolvedValue(true); // always return true

      await expect(actions.createReindexOp('myIndex')).rejects.toThrow();
      expect(client.create).not.toHaveBeenCalled();
    });
  });

  describe('updateReindexOp', () => {
    it('calls update with the combined attributes', async () => {
      await actions.updateReindexOp(
        {
          type: REINDEX_OP_TYPE,
          id: '9',
          attributes: { indexName: 'hi' },
          version: 1,
        } as ReindexSavedObject,
        { newIndexName: 'test' }
      );
      expect(client.update).toHaveBeenCalled();
      const args = client.update.mock.calls[0];
      expect(args[0]).toEqual(REINDEX_OP_TYPE);
      expect(args[1]).toEqual('9');
      expect(args[2].indexName).toEqual('hi');
      expect(args[2].newIndexName).toEqual('test');
      expect(args[3]).toEqual({ version: 1 });
    });
  });

  describe('acquireLock', () => {
    it('calls update if object is unlocked', async () => {
      const reindexOp = { id: '1', attributes: { locked: null } } as ReindexSavedObject;
      const locked = await actions.acquireLock(reindexOp);
      expect(locked.attributes.locked).not.toBeNull();
      expect(client.update).toHaveBeenCalled();
    });

    it('calls update if object lock has expired', async () => {
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
      const locked = await actions.acquireLock(reindexOp);
      expect(locked.attributes.locked).not.toBeNull();
      expect(client.update).toHaveBeenCalled();
    });

    it('throws if lock is not exprired', async () => {
      const reindexOp = {
        id: '1',
        attributes: { locked: moment().format() },
      } as ReindexSavedObject;
      await expect(actions.acquireLock(reindexOp)).rejects.toThrow();
    });
  });

  describe('releaseLock', async () => {
    it('calles update with unlocked', async () => {
      const reindexOp = {
        id: '1',
        attributes: { locked: moment().format() },
      } as ReindexSavedObject;
      await expect(actions.releaseLock(reindexOp)).resolves;
      expect(client.update).toHaveBeenCalled();
      expect(client.update.mock.calls[0][2]).toHaveProperty('locked', null);
    });
  });

  describe('findAllInProgressOperations', () => {
    it('returns saved_objects', async () => {
      client.find.mockResolvedValue({ saved_objects: ['results!'] });
      await expect(actions.findAllInProgressOperations()).resolves.toEqual(['results!']);
      expect(client.find).toHaveBeenCalledWith({
        type: REINDEX_OP_TYPE,
        search: '0',
        searchFields: ['status'],
      });
    });

    it('handles paging', async () => {
      client.find
        .mockResolvedValueOnce({
          total: 20,
          page: 0,
          per_page: 10,
          saved_objects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        })
        .mockResolvedValueOnce({
          total: 20,
          page: 1,
          per_page: 10,
          saved_objects: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        });

      // Really prettier??
      await expect(actions.findAllInProgressOperations()).resolves.toEqual([
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
      ]);
    });
  });

  describe('getBooleanFieldPaths', () => {
    it('returns array of array of boolean path strings', async () => {
      callCluster.mockResolvedValueOnce({
        myIndex: {
          mappings: {
            _doc: {
              properties: {
                field1: { type: 'boolean' },
                nested: { properties: { field2: { type: 'boolean' } } },
              },
            },
          },
        },
      });

      await expect(actions.getBooleanFieldPaths('myIndex')).resolves.toEqual([
        ['field1'],
        ['nested', 'field2'],
      ]);
    });

    it('returns [] if there are no mapping types', async () => {
      callCluster.mockResolvedValueOnce({ myIndex: { mappings: {} } });
      await expect(actions.getBooleanFieldPaths('myIndex')).resolves.toEqual([]);
    });

    it('throws if there are multiple mapping types', async () => {
      callCluster.mockResolvedValueOnce({ myIndex: { mappings: { type1: {}, type2: {} } } });
      await expect(actions.getBooleanFieldPaths('myIndex')).rejects.toThrow();
    });
  });

  describe('getFlatSettings', () => {
    it('returns flat settings', async () => {
      callCluster.mockResolvedValueOnce({
        myIndex: {
          settings: { 'index.mySetting': '1' },
          mappings: {},
        },
      });
      await expect(actions.getFlatSettings('myIndex')).resolves.toEqual({
        settings: { 'index.mySetting': '1' },
        mappings: {},
      });
    });

    it('returns null if index does not exist', async () => {
      callCluster.mockResolvedValueOnce({});
      await expect(actions.getFlatSettings('myIndex')).resolves.toBeNull();
    });
  });

  // TODO
  // describe('cleanupChanges');

  describe('runWhileMlLocked', () => {
    it('creates the ML doc if it does not exist and executes callback', async () => {
      expect.assertions(3);
      client.get.mockRejectedValueOnce(new Error()); // mock no ML doc exists yet
      client.create.mockImplementationOnce((type: any, attributes: any, { id }: any) =>
        Promise.resolve({
          type,
          id,
          attributes,
        })
      );

      let flip = false;
      await actions.runWhileMlLocked(async mlDoc => {
        expect(mlDoc.id).toEqual(ML_LOCK_DOC_ID);
        expect(mlDoc.attributes.mlReindexCount).toEqual(0);
        flip = true;
        return mlDoc;
      });
      expect(flip).toEqual(true);
    });

    it('fails after 10 attempts to lock', async () => {
      jest.setTimeout(20000); // increase the timeout
      client.get.mockResolvedValue({
        type: REINDEX_OP_TYPE,
        id: ML_LOCK_DOC_ID,
        attributes: { mlReindexCount: 0 },
      });

      const acquireLockSpy = jest
        .spyOn(actions, 'acquireLock')
        .mockRejectedValue(new Error('NO LOCKING!'));

      await expect(actions.runWhileMlLocked(async m => m)).rejects.toThrow(
        'Could not acquire lock for ML jobs'
      );
      expect(acquireLockSpy).toHaveBeenCalledTimes(10);

      // Restore the spy and timeout.
      acquireLockSpy.mockRestore();
      jest.setTimeout(5000);
    });
  });
});
