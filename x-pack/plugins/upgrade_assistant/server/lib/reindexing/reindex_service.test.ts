/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../es_indices_state_check', () => ({ esIndicesStateCheck: jest.fn() }));
import { BehaviorSubject } from 'rxjs';
import { TransportResult } from '@elastic/elasticsearch';
import { Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ScopedClusterClientMock } from '@kbn/core/server/elasticsearch/client/mocks';

import {
  ReindexOperation,
  ReindexSavedObject,
  ReindexStatus,
  ReindexStep,
} from '../../../common/types';
import { MAJOR_VERSION } from '../../../common/constants';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';

import { getMockVersionInfo } from '../__fixtures__/version';
import { esIndicesStateCheck } from '../es_indices_state_check';
import { versionService } from '../version';

import { ReindexService, reindexServiceFactory } from './reindex_service';

const asApiResponse = <T>(body: T): TransportResult<T> =>
  ({
    body,
  } as TransportResult<T>);

const { currentMajor, prevMajor } = getMockVersionInfo();

describe('reindexService', () => {
  let actions: jest.Mocked<any>;
  let clusterClient: ScopedClusterClientMock;
  let log: Logger;
  let service: ReindexService;
  let licensingPluginSetup: LicensingPluginSetup;

  const updateMockImpl = (reindexOp: ReindexSavedObject, attrs: Partial<ReindexOperation> = {}) =>
    Promise.resolve({
      ...reindexOp,
      attributes: { ...reindexOp.attributes, ...attrs },
    } as ReindexSavedObject);

  const unimplemented = (name: string) => () =>
    Promise.reject(`Mock function ${name} was not implemented!`);

  beforeEach(() => {
    (esIndicesStateCheck as jest.Mock).mockResolvedValue({});
    actions = {
      createReindexOp: jest.fn(unimplemented('createReindexOp')),
      deleteReindexOp: jest.fn(unimplemented('deleteReindexOp')),
      updateReindexOp: jest.fn(updateMockImpl),
      runWhileLocked: jest.fn((reindexOp: any, func: any) => func(reindexOp)),
      findReindexOperations: jest.fn(unimplemented('findReindexOperations')),
      findAllByStatus: jest.fn(unimplemented('findAllInProgressOperations')),
      getFlatSettings: jest.fn(unimplemented('getFlatSettings')),
      cleanupChanges: jest.fn(),
    };
    clusterClient = elasticsearchServiceMock.createScopedClusterClient();
    log = loggingSystemMock.create().get();
    licensingPluginSetup = licensingMock.createSetup();
    licensingPluginSetup.license$ = new BehaviorSubject(
      licensingMock.createLicense({
        features: { security: { isAvailable: true, isEnabled: true } },
      })
    );

    service = reindexServiceFactory(
      clusterClient.asCurrentUser,
      actions,
      log,
      licensingPluginSetup
    );

    versionService.setup(MAJOR_VERSION);
  });

  describe('hasRequiredPrivileges', () => {
    it('returns true if security is disabled', async () => {
      licensingPluginSetup.license$ = new BehaviorSubject(
        licensingMock.createLicense({
          features: { security: { isAvailable: true, isEnabled: false } },
        })
      );
      const hasRequired = await service.hasRequiredPrivileges('anIndex');
      expect(hasRequired).toBe(true);
    });

    it('calls security API with basic requirements', async () => {
      clusterClient.asCurrentUser.security.hasPrivileges.mockResponse(
        // @ts-expect-error not full interface
        { has_all_requested: true }
      );

      const hasRequired = await service.hasRequiredPrivileges('anIndex');
      expect(hasRequired).toBe(true);
      expect(clusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
        body: {
          cluster: ['manage'],
          index: [
            {
              names: ['anIndex', `reindexed-v${currentMajor}-anIndex`],
              allow_restricted_indices: true,
              privileges: ['all'],
            },
            {
              names: ['.tasks'],
              privileges: ['read', 'delete'],
            },
          ],
        },
      });
    });

    it('includes checking for permissions on the baseName which could be an alias', async () => {
      clusterClient.asCurrentUser.security.hasPrivileges.mockResponse(
        // @ts-expect-error not full interface
        { has_all_requested: true }
      );

      const hasRequired = await service.hasRequiredPrivileges(`reindexed-v${prevMajor}-anIndex`);
      expect(hasRequired).toBe(true);
      expect(clusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
        body: {
          cluster: ['manage'],
          index: [
            {
              names: [
                `reindexed-v${prevMajor}-anIndex`,
                `reindexed-v${currentMajor}-anIndex`,
                'anIndex',
              ],
              allow_restricted_indices: true,
              privileges: ['all'],
            },
            {
              names: ['.tasks'],
              privileges: ['read', 'delete'],
            },
          ],
        },
      });
    });
  });

  describe('detectReindexWarnings', () => {
    it('fetches reindex warnings from flat settings', async () => {
      const indexName = 'myIndex';
      actions.getFlatSettings.mockResolvedValueOnce({
        settings: {
          'index.provided_name': indexName,
        },
        mappings: {
          _doc: { properties: { https: { type: 'boolean' } } },
        },
      });

      const reindexWarnings = await service.detectReindexWarnings(indexName);
      expect(reindexWarnings).toEqual([
        {
          warningType: 'replaceIndexWithAlias',
        },
      ]);
    });

    it('returns null if index does not exist', async () => {
      actions.getFlatSettings.mockResolvedValueOnce(null);
      const reindexWarnings = await service.detectReindexWarnings('myIndex');
      expect(reindexWarnings).toBeUndefined();
    });
  });

  describe('createReindexOperation', () => {
    it('creates new reindex operation', async () => {
      clusterClient.asCurrentUser.indices.exists.mockResponse(true);
      actions.findReindexOperations.mockResolvedValueOnce({ total: 0 });
      actions.createReindexOp.mockResolvedValueOnce();

      await service.createReindexOperation('myIndex');

      expect(actions.createReindexOp).toHaveBeenCalledWith('myIndex', undefined);
    });

    it('fails if index does not exist', async () => {
      clusterClient.asCurrentUser.indices.exists.mockResponse(false);
      await expect(service.createReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.createReindexOp).not.toHaveBeenCalled();
    });

    it('deletes existing operation if it failed', async () => {
      clusterClient.asCurrentUser.indices.exists.mockResponse(true);
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

    it('deletes existing operation if it was cancelled', async () => {
      clusterClient.asCurrentUser.indices.exists.mockResponse(true);
      actions.findReindexOperations.mockResolvedValueOnce({
        saved_objects: [{ id: 1, attributes: { status: ReindexStatus.cancelled } }],
        total: 1,
      });
      actions.deleteReindexOp.mockResolvedValueOnce();
      actions.createReindexOp.mockResolvedValueOnce();

      await service.createReindexOperation('myIndex');
      expect(actions.deleteReindexOp).toHaveBeenCalledWith({
        id: 1,
        attributes: { status: ReindexStatus.cancelled },
      });
    });

    it('fails if existing operation did not fail', async () => {
      clusterClient.asCurrentUser.indices.exists.mockResponse(true);
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
      } as any);

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

    it('throws if reindex operation does not exist', async () => {
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
      } as any);

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

    it('throws if reindex operation does not exist', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(null);
      await expect(service.resumeReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.updateReindexOp).not.toHaveBeenCalled();
      findSpy.mockRestore();
    });
  });

  describe('cancelReindexing', () => {
    it('cancels the reindex task', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce({
        id: '2',
        attributes: {
          indexName: 'myIndex',
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.reindexStarted,
          reindexTaskId: '999333',
        },
      } as any);

      // @ts-expect-error not full interface
      clusterClient.asCurrentUser.tasks.cancel.mockResponse(true);

      await service.cancelReindexing('myIndex');
      expect(clusterClient.asCurrentUser.tasks.cancel).toHaveBeenCalledWith({ task_id: '999333' });
      findSpy.mockRestore();
    });

    it('throws if reindexOp status is not inProgress', async () => {
      const reindexOp = {
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.failed, reindexTaskId: '999333' },
      } as ReindexSavedObject;
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(reindexOp);

      await expect(service.cancelReindexing('myIndex')).rejects.toThrow();
      expect(clusterClient.asCurrentUser.tasks.cancel).not.toHaveBeenCalledWith(
        asApiResponse({
          taskId: '999333',
        })
      );
      findSpy.mockRestore();
    });

    it('throws if reindexOp lastCompletedStep is not reindexStarted', async () => {
      const reindexOp = {
        id: '2',
        attributes: {
          indexName: 'myIndex',
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.reindexCompleted,
          reindexTaskId: '999333',
        },
      } as ReindexSavedObject;
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(reindexOp);

      await expect(service.cancelReindexing('myIndex')).rejects.toThrow();
      expect(clusterClient.asCurrentUser.tasks.cancel).not.toHaveBeenCalledWith(
        asApiResponse({
          taskId: '999333',
        })
      );
      findSpy.mockRestore();
    });

    it('throws if reindex operation does not exist', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(null);
      await expect(service.cancelReindexing('myIndex')).rejects.toThrow();
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

    describe('readonly', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.readonly },
      } as ReindexSavedObject;

      // The more intricate details of how the settings are chosen are test separately.
      it('creates new index with settings and mappings and updates lastCompletedStep', async () => {
        actions.getFlatSettings.mockResolvedValueOnce(settingsMappings);
        clusterClient.asCurrentUser.indices.create.mockResponse(
          // @ts-expect-error not full interface
          { acknowledged: true }
        );
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.newIndexCreated);
        expect(clusterClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
          index: 'myIndex-reindex-0',
          body: {
            // index.blocks.write should be removed from the settings for the new index.
            settings: { 'index.number_of_replicas': 7 },
            mappings: settingsMappings.mappings,
          },
        });
      });

      it('fails if create index is not acknowledged', async () => {
        clusterClient.asCurrentUser.indices.get.mockResponseOnce(
          // @ts-expect-error not full interface
          { myIndex: settingsMappings }
        );

        clusterClient.asCurrentUser.indices.create.mockResponseOnce(
          // @ts-expect-error not full interface
          { acknowledged: false }
        );
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.readonly);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
        expect(log.error).toHaveBeenCalledWith(expect.any(String));
      });

      it('fails if create index fails', async () => {
        clusterClient.asCurrentUser.indices.get.mockResponseOnce(
          // @ts-expect-error not full interface
          { myIndex: settingsMappings }
        );

        clusterClient.asCurrentUser.indices.create.mockRejectedValueOnce(new Error(`blah!`));

        clusterClient.asCurrentUser.indices.putSettings.mockResponseOnce({ acknowledged: true });

        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.readonly);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
        expect(log.error).toHaveBeenCalledWith(expect.any(String));

        // Original index should have been set back to allow reads.
        expect(clusterClient.asCurrentUser.indices.putSettings).toHaveBeenCalledWith({
          index: 'myIndex',
          body: { blocks: { write: false } },
        });
      });
    });

    describe('newIndexCreated', () => {
      const reindexOp = {
        id: '1',
        attributes: {
          ...defaultAttributes,
          lastCompletedStep: ReindexStep.newIndexCreated,
        },
      } as ReindexSavedObject;

      beforeEach(() => {
        actions.getFlatSettings.mockResolvedValueOnce({
          settings: {},
          mappings: {},
        });
      });

      it('starts reindex, saves taskId, and updates lastCompletedStep', async () => {
        clusterClient.asCurrentUser.reindex.mockResponseOnce({ task: 'xyz' });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
        expect(updatedOp.attributes.reindexTaskId).toEqual('xyz');
        expect(updatedOp.attributes.reindexTaskPercComplete).toEqual(0);
        expect(clusterClient.asCurrentUser.reindex).toHaveBeenLastCalledWith({
          refresh: true,
          wait_for_completion: false,
          body: {
            source: { index: 'myIndex' },
            dest: { index: 'myIndex-reindex-0' },
          },
        });
      });

      it('fails if starting reindex fails', async () => {
        clusterClient.asCurrentUser.reindex.mockRejectedValueOnce(new Error('blah!'));
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.newIndexCreated);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
        expect(log.error).toHaveBeenCalledWith(expect.any(String));
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
          clusterClient.asCurrentUser.tasks.get.mockResponseOnce({
            completed: false,
            // @ts-expect-error not full interface
            task: { status: { created: 10, total: 100 } },
          });

          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
          expect(updatedOp.attributes.reindexTaskPercComplete).toEqual(0.1); // 10 / 100 = 0.1
        });
      });

      describe('reindex task is complete', () => {
        it('deletes task, updates reindexTaskPercComplete, updates lastCompletedStep', async () => {
          clusterClient.asCurrentUser.tasks.get.mockResponseOnce({
            completed: true,
            // @ts-expect-error not full interface
            task: { status: { created: 100, total: 100 } },
          });

          clusterClient.asCurrentUser.count.mockResponseOnce(
            // @ts-expect-error not full interface
            {
              count: 100,
            }
          );

          clusterClient.asCurrentUser.delete.mockResponseOnce(
            // @ts-expect-error not full interface
            {
              result: 'deleted',
            }
          );

          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexCompleted);
          expect(updatedOp.attributes.reindexTaskPercComplete).toEqual(1);
          expect(clusterClient.asCurrentUser.delete).toHaveBeenCalledWith({
            index: '.tasks',
            id: 'xyz',
          });
        });

        it('fails if docs created is less than count in source index', async () => {
          clusterClient.asCurrentUser.tasks.get.mockResponseOnce({
            completed: true,
            // @ts-expect-error not full interface
            task: { status: { created: 95, total: 95 } },
          });

          clusterClient.asCurrentUser.count.mockResponseOnce(
            // @ts-expect-error not full interface
            {
              count: 100,
            }
          );

          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(updatedOp.attributes.errorMessage).not.toBeNull();
          expect(log.error).toHaveBeenCalledWith(expect.any(String));
        });
      });

      describe('reindex task is cancelled', () => {
        it('deletes task, updates status to cancelled', async () => {
          clusterClient.asCurrentUser.tasks.get.mockResponseOnce({
            completed: true,
            // @ts-expect-error not full interface
            task: { status: { created: 100, total: 100, canceled: 'by user request' } },
          });

          clusterClient.asCurrentUser.delete.mockResponseOnce(
            // @ts-expect-error not full interface
            { result: 'deleted' }
          );

          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.cancelled);
          expect(clusterClient.asCurrentUser.delete).toHaveBeenLastCalledWith({
            index: '.tasks',
            id: 'xyz',
          });
        });
      });
    });

    describe('reindexCompleted', () => {
      const reindexOp = {
        id: '1',
        attributes: {
          ...defaultAttributes,
          lastCompletedStep: ReindexStep.reindexCompleted,
          reindexOptions: { openAndClose: false },
        },
      } as ReindexSavedObject;

      it('switches aliases, sets as complete, and updates lastCompletedStep', async () => {
        clusterClient.asCurrentUser.indices.getAlias.mockResponseOnce({ myIndex: { aliases: {} } });
        clusterClient.asCurrentUser.indices.updateAliases.mockResponseOnce({ acknowledged: true });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
        expect(clusterClient.asCurrentUser.indices.updateAliases).toHaveBeenCalledWith({
          body: {
            actions: [
              { add: { index: 'myIndex-reindex-0', alias: 'myIndex' } },
              { remove_index: { index: 'myIndex' } },
            ],
          },
        });
      });

      it('moves existing aliases over to new index', async () => {
        clusterClient.asCurrentUser.indices.getAlias.mockResponseOnce({
          myIndex: {
            aliases: {
              myAlias: {},
              myFilteredAlias: { filter: { term: { https: true } } },
            },
          },
        });

        clusterClient.asCurrentUser.indices.updateAliases.mockResponseOnce({ acknowledged: true });

        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
        expect(clusterClient.asCurrentUser.indices.updateAliases).toHaveBeenCalledWith({
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
        clusterClient.asCurrentUser.indices.updateAliases.mockResponseOnce({ acknowledged: false });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexCompleted);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
        expect(log.error).toHaveBeenCalledWith(expect.any(String));
      });

      it('fails if switching aliases fails', async () => {
        clusterClient.asCurrentUser.indices.updateAliases.mockRejectedValueOnce(new Error('blah!'));
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexCompleted);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
        expect(log.error).toHaveBeenCalledWith(expect.any(String));
      });
    });

    describe('aliasCreated', () => {
      const reindexOp = {
        id: '1',
        attributes: {
          ...defaultAttributes,
          lastCompletedStep: ReindexStep.aliasCreated,
        },
      } as ReindexSavedObject;

      it('sets reindex status as complete', async () => {
        await service.processNextStep(reindexOp);
        expect(actions.updateReindexOp).toHaveBeenCalledWith(reindexOp, {
          status: ReindexStatus.completed,
        });
      });
    });
  });
});
