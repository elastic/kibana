/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { listMock } from '../../../../../lists/server/mocks';
import { ExceptionListClient } from '../../../../../lists/server';
import { ConditionEntryField } from '../../../../common/endpoint/types';
import { createConditionEntry, createEntryMatch } from './mapping';
import { createTrustedApp, deleteTrustedApp, getTrustedAppsList } from './service';

const exceptionsListClient = listMock.getExceptionListClient() as jest.Mocked<ExceptionListClient>;

describe('service', () => {
  describe('deleteTrustedApp', () => {
    it('should invoke ExceptionsListClient properly', async () => {
      expect(await deleteTrustedApp(exceptionsListClient, { id: '123' })).toBeUndefined();

      expect(exceptionsListClient.deleteExceptionListItem).toHaveBeenCalledWith({
        id: '123',
        namespaceType: 'agnostic',
      });
    });
  });

  describe('createTrustedApp', () => {
    it('should invoke ExceptionsListClient properly', async () => {
      exceptionsListClient.createExceptionListItem.mockResolvedValue({
        _version: '123',
        id: '123',
        comments: [],
        created_at: '11/11/2011T11:11:11.111',
        created_by: 'admin',
        description: 'Linux trusted app 1',
        entries: [
          createEntryMatch('process.executable.caseless', '/bin/malware'),
          createEntryMatch('process.hash.md5', '1234234659AF249DDF3E40864E9FB241'),
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
      });

      const result = await createTrustedApp(exceptionsListClient, {
        name: 'linux trusted app 1',
        description: 'Linux trusted app 1',
        os: 'linux',
        entries: [
          createConditionEntry(ConditionEntryField.PATH, '/bin/malware'),
          createConditionEntry(ConditionEntryField.HASH, '1234234659AF249DDF3E40864E9FB241'),
        ],
      });

      expect(result).toEqual({
        data: {
          id: '123',
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          name: 'linux trusted app 1',
          description: 'Linux trusted app 1',
          os: 'linux',
          entries: [
            createConditionEntry(ConditionEntryField.HASH, '1234234659AF249DDF3E40864E9FB241'),
            createConditionEntry(ConditionEntryField.PATH, '/bin/malware'),
          ],
        },
      });

      expect(exceptionsListClient.createTrustedAppsList).toHaveBeenCalled();
    });
  });

  describe('getTrustedAppsList', () => {
    it('should invoke ExceptionsListClient properly', async () => {
      exceptionsListClient.findExceptionListItem.mockResolvedValue({
        data: [
          {
            _version: '123',
            id: '123',
            comments: [],
            created_at: '11/11/2011T11:11:11.111',
            created_by: 'admin',
            description: 'Linux trusted app 1',
            entries: [
              createEntryMatch('process.executable.caseless', '/bin/malware'),
              createEntryMatch('process.hash.md5', '1234234659AF249DDF3E40864E9FB241'),
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
          },
        ],
        page: 1,
        per_page: 20,
        total: 100,
      });

      const result = await getTrustedAppsList(exceptionsListClient, {
        page: 1,
        per_page: 20,
      });

      expect(result).toEqual({
        data: [
          {
            id: '123',
            created_at: '11/11/2011T11:11:11.111',
            created_by: 'admin',
            name: 'linux trusted app 1',
            description: 'Linux trusted app 1',
            os: 'linux',
            entries: [
              createConditionEntry(ConditionEntryField.HASH, '1234234659AF249DDF3E40864E9FB241'),
              createConditionEntry(ConditionEntryField.PATH, '/bin/malware'),
            ],
          },
        ],
        page: 1,
        per_page: 20,
        total: 100,
      });

      expect(exceptionsListClient.createTrustedAppsList).toHaveBeenCalled();
    });
  });
});
