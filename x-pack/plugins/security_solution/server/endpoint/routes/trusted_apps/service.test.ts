/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '../../../../../lists/common/schemas/response';
import { listMock } from '../../../../../lists/server/mocks';
import { ExceptionListClient } from '../../../../../lists/server';
import {
  ConditionEntryField,
  OperatingSystem,
  TrustedApp,
} from '../../../../common/endpoint/types';
import { createConditionEntry, createEntryMatch } from './mapping';
import {
  createTrustedApp,
  deleteTrustedApp,
  getTrustedApp,
  getTrustedAppsList,
  getTrustedAppsSummary,
  updateTrustedApp,
} from './service';
import { TrustedAppNotFoundError, TrustedAppVersionConflictError } from './errors';
import { toUpdateTrustedApp } from '../../../../common/endpoint/service/trusted_apps/to_update_trusted_app';
import { updateExceptionListItemImplementationMock } from './test_utils';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../../lists/common';

const exceptionsListClient = listMock.getExceptionListClient() as jest.Mocked<ExceptionListClient>;

const EXCEPTION_LIST_ITEM: ExceptionListItemSchema = {
  _version: 'abc123',
  id: '123',
  comments: [],
  created_at: '11/11/2011T11:11:11.111',
  created_by: 'admin',
  description: 'Linux trusted app 1',
  entries: [
    createEntryMatch('process.executable.caseless', '/bin/malware'),
    createEntryMatch('process.hash.md5', '1234234659af249ddf3e40864e9fb241'),
  ],
  item_id: '123',
  list_id: 'endpoint_trusted_apps',
  meta: undefined,
  name: 'linux trusted app 1',
  namespace_type: 'agnostic',
  os_types: ['linux'],
  tags: ['policy:all'],
  type: 'simple',
  tie_breaker_id: '123',
  updated_at: '11/11/2011T11:11:11.111',
  updated_by: 'admin',
};

const TRUSTED_APP: TrustedApp = {
  id: '123',
  version: 'abc123',
  created_at: '11/11/2011T11:11:11.111',
  created_by: 'admin',
  updated_at: '11/11/2011T11:11:11.111',
  updated_by: 'admin',
  name: 'linux trusted app 1',
  description: 'Linux trusted app 1',
  os: OperatingSystem.LINUX,
  effectScope: { type: 'global' },
  entries: [
    createConditionEntry(ConditionEntryField.HASH, 'match', '1234234659af249ddf3e40864e9fb241'),
    createConditionEntry(ConditionEntryField.PATH, 'match', '/bin/malware'),
  ],
};

describe('service', () => {
  beforeEach(() => {
    exceptionsListClient.deleteExceptionListItem.mockReset();
    exceptionsListClient.createExceptionListItem.mockReset();
    exceptionsListClient.findExceptionListItem.mockReset();
    exceptionsListClient.createTrustedAppsList.mockReset();
  });

  describe('deleteTrustedApp', () => {
    it('should delete existing trusted app', async () => {
      exceptionsListClient.deleteExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);

      expect(await deleteTrustedApp(exceptionsListClient, { id: '123' })).toBeUndefined();

      expect(exceptionsListClient.deleteExceptionListItem).toHaveBeenCalledWith({
        id: '123',
        namespaceType: 'agnostic',
      });
    });

    it('should throw for non existing trusted app', async () => {
      exceptionsListClient.deleteExceptionListItem.mockResolvedValue(null);

      await expect(deleteTrustedApp(exceptionsListClient, { id: '123' })).rejects.toBeInstanceOf(
        TrustedAppNotFoundError
      );
    });
  });

  describe('createTrustedApp', () => {
    it('should create trusted app', async () => {
      exceptionsListClient.createExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);

      const result = await createTrustedApp(exceptionsListClient, {
        name: 'linux trusted app 1',
        description: 'Linux trusted app 1',
        effectScope: { type: 'global' },
        os: OperatingSystem.LINUX,
        entries: [
          createConditionEntry(ConditionEntryField.PATH, 'match', '/bin/malware'),
          createConditionEntry(
            ConditionEntryField.HASH,
            'match',
            '1234234659af249ddf3e40864e9fb241'
          ),
        ],
      });

      expect(result).toEqual({ data: TRUSTED_APP });

      expect(exceptionsListClient.createTrustedAppsList).toHaveBeenCalled();
    });

    it('should create trusted app with correct wildcard type', async () => {
      exceptionsListClient.createExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);

      const result = await createTrustedApp(exceptionsListClient, {
        name: 'linux trusted app 1',
        description: 'Linux trusted app 1',
        effectScope: { type: 'global' },
        os: OperatingSystem.LINUX,
        entries: [
          createConditionEntry(ConditionEntryField.PATH, 'wildcard', '/bin/malware'),
          createConditionEntry(
            ConditionEntryField.HASH,
            'wildcard',
            '1234234659af249ddf3e40864e9fb241'
          ),
        ],
      });

      expect(result).toEqual({ data: TRUSTED_APP });

      expect(exceptionsListClient.createTrustedAppsList).toHaveBeenCalled();
    });
  });

  describe('getTrustedAppsList', () => {
    beforeEach(() => {
      exceptionsListClient.findExceptionListItem.mockResolvedValue({
        data: [EXCEPTION_LIST_ITEM],
        page: 1,
        per_page: 20,
        total: 100,
      });
    });

    it('should get trusted apps', async () => {
      const result = await getTrustedAppsList(exceptionsListClient, { page: 1, per_page: 20 });

      expect(result).toEqual({ data: [TRUSTED_APP], page: 1, per_page: 20, total: 100 });

      expect(exceptionsListClient.createTrustedAppsList).toHaveBeenCalled();
    });

    it('should allow KQL to be defined', async () => {
      const result = await getTrustedAppsList(exceptionsListClient, {
        page: 1,
        per_page: 20,
        kuery: 'some-param.key: value',
      });

      expect(result).toEqual({ data: [TRUSTED_APP], page: 1, per_page: 20, total: 100 });
      expect(exceptionsListClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        page: 1,
        perPage: 20,
        filter: 'some-param.key: value',
        namespaceType: 'agnostic',
        sortField: 'name',
        sortOrder: 'asc',
      });
    });
  });

  describe('getTrustedAppsSummary', () => {
    beforeEach(() => {
      exceptionsListClient.findExceptionListItem.mockImplementation(async ({ page }) => {
        let data: ExceptionListItemSchema[] = [];

        // linux ++ windows entries
        if (page === 1) {
          data = [
            ...Array.from<void, ExceptionListItemSchema>({ length: 45 }, () => ({
              ...EXCEPTION_LIST_ITEM,
              os_types: ['linux'],
            })),
            ...Array.from({ length: 55 }, () => ({
              ...EXCEPTION_LIST_ITEM,
              os_types: ['windows'] as ExceptionListItemSchema['os_types'],
            })),
          ];
        }

        // macos entries
        if (page === 2) {
          data = [
            ...Array.from({ length: 30 }, () => ({
              ...EXCEPTION_LIST_ITEM,
              os_types: ['macos'] as ExceptionListItemSchema['os_types'],
            })),
          ];
        }

        return {
          data,
          page: page || 1,
          total: 130,
          per_page: 100,
        };
      });
    });

    it('should return summary of trusted app items', async () => {
      expect(await getTrustedAppsSummary(exceptionsListClient)).toEqual({
        linux: 45,
        windows: 55,
        macos: 30,
        total: 130,
      });
    });
  });

  describe('updateTrustedApp', () => {
    beforeEach(() => {
      exceptionsListClient.getExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);

      exceptionsListClient.updateExceptionListItem.mockImplementationOnce(
        updateExceptionListItemImplementationMock
      );
    });

    afterEach(() => jest.resetAllMocks());

    it('should update exception item with trusted app data', async () => {
      const trustedAppForUpdate = toUpdateTrustedApp(TRUSTED_APP);
      trustedAppForUpdate.name = 'updated name';
      trustedAppForUpdate.description = 'updated description';
      trustedAppForUpdate.entries = [trustedAppForUpdate.entries[0]];

      await expect(
        updateTrustedApp(exceptionsListClient, TRUSTED_APP.id, trustedAppForUpdate)
      ).resolves.toEqual({
        data: {
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          updated_at: '11/11/2011T11:11:11.111',
          updated_by: 'admin',
          description: 'updated description',
          effectScope: {
            type: 'global',
          },
          entries: [
            {
              field: 'process.hash.*',
              operator: 'included',
              type: 'match',
              value: '1234234659af249ddf3e40864e9fb241',
            },
          ],
          id: '123',
          name: 'updated name',
          os: 'linux',
          version: 'abc123',
        },
      });
    });

    it('should throw a Not Found error if trusted app is not found prior to making update', async () => {
      exceptionsListClient.getExceptionListItem.mockResolvedValueOnce(null);
      await expect(
        updateTrustedApp(exceptionsListClient, TRUSTED_APP.id, toUpdateTrustedApp(TRUSTED_APP))
      ).rejects.toBeInstanceOf(TrustedAppNotFoundError);
    });

    it('should throw a Version Conflict error if update fails with 409', async () => {
      exceptionsListClient.updateExceptionListItem.mockReset();
      exceptionsListClient.updateExceptionListItem.mockRejectedValueOnce(
        Object.assign(new Error('conflict'), { output: { statusCode: 409 } })
      );

      await expect(
        updateTrustedApp(exceptionsListClient, TRUSTED_APP.id, toUpdateTrustedApp(TRUSTED_APP))
      ).rejects.toBeInstanceOf(TrustedAppVersionConflictError);
    });

    it('should throw Not Found if exception item is not found during update', async () => {
      exceptionsListClient.updateExceptionListItem.mockReset();
      exceptionsListClient.updateExceptionListItem.mockResolvedValueOnce(null);

      exceptionsListClient.getExceptionListItem.mockReset();
      exceptionsListClient.getExceptionListItem.mockResolvedValueOnce(EXCEPTION_LIST_ITEM);
      exceptionsListClient.getExceptionListItem.mockResolvedValueOnce(null);

      await expect(
        updateTrustedApp(exceptionsListClient, TRUSTED_APP.id, toUpdateTrustedApp(TRUSTED_APP))
      ).rejects.toBeInstanceOf(TrustedAppNotFoundError);
    });
  });

  describe('getTrustedApp', () => {
    it('should return a single trusted app', async () => {
      exceptionsListClient.getExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);
      expect(await getTrustedApp(exceptionsListClient, '123')).toEqual({ data: TRUSTED_APP });
    });

    it('should return Trusted App Not Found Error if it does not exist', async () => {
      exceptionsListClient.getExceptionListItem.mockResolvedValue(null);
      await expect(getTrustedApp(exceptionsListClient, '123')).rejects.toBeInstanceOf(
        TrustedAppNotFoundError
      );
    });
  });
});
