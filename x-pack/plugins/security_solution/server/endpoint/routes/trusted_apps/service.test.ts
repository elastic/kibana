/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '../../../../../lists/common/schemas/response';
import { listMock } from '../../../../../lists/server/mocks';
import { ExceptionListClient } from '../../../../../lists/server';
import { ConditionEntryField, OperatingSystem } from '../../../../common/endpoint/types';
import { createConditionEntry, createEntryMatch } from './mapping';
import {
  createTrustedApp,
  deleteTrustedApp,
  getTrustedAppsList,
  getTrustedAppsSummary,
  MissingTrustedAppException,
} from './service';

const exceptionsListClient = listMock.getExceptionListClient() as jest.Mocked<ExceptionListClient>;

const EXCEPTION_LIST_ITEM: ExceptionListItemSchema = {
  _version: '123',
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
  tags: [],
  type: 'simple',
  tie_breaker_id: '123',
  updated_at: '11/11/2011T11:11:11.111',
  updated_by: 'admin',
};

const TRUSTED_APP = {
  id: '123',
  created_at: '11/11/2011T11:11:11.111',
  created_by: 'admin',
  name: 'linux trusted app 1',
  description: 'Linux trusted app 1',
  os: OperatingSystem.LINUX,
  entries: [
    createConditionEntry(ConditionEntryField.HASH, '1234234659af249ddf3e40864e9fb241'),
    createConditionEntry(ConditionEntryField.PATH, '/bin/malware'),
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
        MissingTrustedAppException
      );
    });
  });

  describe('createTrustedApp', () => {
    it('should create trusted app', async () => {
      exceptionsListClient.createExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);

      const result = await createTrustedApp(exceptionsListClient, {
        name: 'linux trusted app 1',
        description: 'Linux trusted app 1',
        os: OperatingSystem.LINUX,
        entries: [
          createConditionEntry(ConditionEntryField.PATH, '/bin/malware'),
          createConditionEntry(ConditionEntryField.HASH, '1234234659af249ddf3e40864e9fb241'),
        ],
      });

      expect(result).toEqual({ data: TRUSTED_APP });

      expect(exceptionsListClient.createTrustedAppsList).toHaveBeenCalled();
    });
  });

  describe('getTrustedAppsList', () => {
    it('should get trusted apps', async () => {
      exceptionsListClient.findExceptionListItem.mockResolvedValue({
        data: [EXCEPTION_LIST_ITEM],
        page: 1,
        per_page: 20,
        total: 100,
      });

      const result = await getTrustedAppsList(exceptionsListClient, { page: 1, per_page: 20 });

      expect(result).toEqual({ data: [TRUSTED_APP], page: 1, per_page: 20, total: 100 });

      expect(exceptionsListClient.createTrustedAppsList).toHaveBeenCalled();
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
});
