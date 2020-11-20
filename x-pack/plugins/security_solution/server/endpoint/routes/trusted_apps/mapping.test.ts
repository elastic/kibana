/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateExceptionListItemOptions } from '../../../../../lists/server';
import { ExceptionListItemSchema } from '../../../../../lists/common/schemas/response';

import { ConditionEntryField, NewTrustedApp, TrustedApp } from '../../../../common/endpoint/types';

import {
  createConditionEntry,
  createEntryMatch,
  createEntryNested,
  exceptionListItemToTrustedApp,
  newTrustedAppToCreateExceptionListItemOptions,
} from './mapping';

describe('mapping', () => {
  describe('newTrustedAppToCreateExceptionListItemOptions', () => {
    const testMapping = (input: NewTrustedApp, expectedResult: CreateExceptionListItemOptions) => {
      expect(newTrustedAppToCreateExceptionListItemOptions(input)).toEqual(expectedResult);
    };

    it('should map linux trusted app containing MD5 hash condition properly', function () {
      testMapping(
        {
          name: 'linux trusted app 1',
          description: 'Linux trusted app 1',
          os: 'linux',
          entries: [
            createConditionEntry(ConditionEntryField.PATH, '/bin/malware'),
            createConditionEntry(ConditionEntryField.HASH, '1234234659AF249DDF3E40864E9FB241'),
          ],
        },
        {
          comments: [],
          description: 'Linux trusted app 1',
          entries: [
            createEntryMatch('process.executable.caseless', '/bin/malware'),
            createEntryMatch('process.hash.md5', '1234234659AF249DDF3E40864E9FB241'),
          ],
          itemId: expect.any(String),
          listId: 'endpoint_trusted_apps',
          meta: undefined,
          name: 'linux trusted app 1',
          namespaceType: 'agnostic',
          osTypes: ['linux'],
          tags: [],
          type: 'simple',
        }
      );
    });

    it('should map macos trusted app containing SHA1 hash condition properly', function () {
      testMapping(
        {
          name: 'macos trusted app 1',
          description: 'MacOS trusted app 1',
          os: 'macos',
          entries: [
            createConditionEntry(ConditionEntryField.PATH, '/bin/malware'),
            createConditionEntry(
              ConditionEntryField.HASH,
              'F635DA961234234659AF249DDF3E40864E9FB241'
            ),
          ],
        },
        {
          comments: [],
          description: 'MacOS trusted app 1',
          entries: [
            createEntryMatch('process.executable.caseless', '/bin/malware'),
            createEntryMatch('process.hash.sha1', 'F635DA961234234659AF249DDF3E40864E9FB241'),
          ],
          itemId: expect.any(String),
          listId: 'endpoint_trusted_apps',
          meta: undefined,
          name: 'macos trusted app 1',
          namespaceType: 'agnostic',
          osTypes: ['macos'],
          tags: [],
          type: 'simple',
        }
      );
    });

    it('should map windows trusted app containing SHA256 hash condition properly', function () {
      testMapping(
        {
          name: 'windows trusted app 1',
          description: 'Windows trusted app 1',
          os: 'windows',
          entries: [
            createConditionEntry(ConditionEntryField.SIGNER, 'Microsoft Windows'),
            createConditionEntry(ConditionEntryField.PATH, 'C:\\Program Files\\Malware'),
            createConditionEntry(
              ConditionEntryField.HASH,
              'F635DA96124659AF249DDF3E40864E9FB234234659AF249DDF3E40864E9FB241'
            ),
          ],
        },
        {
          comments: [],
          description: 'Windows trusted app 1',
          entries: [
            createEntryNested('process.Ext.code_signature', [
              createEntryMatch('trusted', 'true'),
              createEntryMatch('subject_name', 'Microsoft Windows'),
            ]),
            createEntryMatch('process.executable.caseless', 'C:\\Program Files\\Malware'),
            createEntryMatch(
              'process.hash.sha256',
              'F635DA96124659AF249DDF3E40864E9FB234234659AF249DDF3E40864E9FB241'
            ),
          ],
          itemId: expect.any(String),
          listId: 'endpoint_trusted_apps',
          meta: undefined,
          name: 'windows trusted app 1',
          namespaceType: 'agnostic',
          osTypes: ['windows'],
          tags: [],
          type: 'simple',
        }
      );
    });
  });

  describe('exceptionListItemToTrustedApp', () => {
    const testMapping = (input: ExceptionListItemSchema, expectedResult: TrustedApp) => {
      expect(exceptionListItemToTrustedApp(input)).toEqual(expectedResult);
    };

    it('should map linux exception list item containing MD5 hash entry match properly', function () {
      testMapping(
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
        }
      );
    });

    it('should map macos exception list item containing SHA1 hash entry match properly', function () {
      testMapping(
        {
          _version: '123',
          id: '123',
          comments: [],
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          description: 'MacOS trusted app 1',
          entries: [
            createEntryMatch('process.executable.caseless', '/bin/malware'),
            createEntryMatch('process.hash.sha1', 'F635DA961234234659AF249DDF3E40864E9FB241'),
          ],
          item_id: '123',
          list_id: 'endpoint_trusted_apps',
          meta: undefined,
          name: 'macos trusted app 1',
          namespace_type: 'agnostic',
          os_types: ['macos'],
          tags: [],
          type: 'simple',
          tie_breaker_id: '123',
          updated_at: '11/11/2011T11:11:11.111',
          updated_by: 'admin',
        },
        {
          id: '123',
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          name: 'macos trusted app 1',
          description: 'MacOS trusted app 1',
          os: 'macos',
          entries: [
            createConditionEntry(
              ConditionEntryField.HASH,
              'F635DA961234234659AF249DDF3E40864E9FB241'
            ),
            createConditionEntry(ConditionEntryField.PATH, '/bin/malware'),
          ],
        }
      );
    });

    it('should map windows exception list item containing SHA256 hash entry match properly', function () {
      testMapping(
        {
          _version: '123',
          id: '123',
          comments: [],
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          description: 'Windows trusted app 1',
          entries: [
            createEntryNested('process.Ext.code_signature', [
              createEntryMatch('trusted', 'true'),
              createEntryMatch('subject_name', 'Microsoft Windows'),
            ]),
            createEntryMatch('process.executable.caseless', 'C:\\Program Files\\Malware'),
            createEntryMatch(
              'process.hash.sha256',
              'F635DA96124659AF249DDF3E40864E9FB234234659AF249DDF3E40864E9FB241'
            ),
          ],
          item_id: '123',
          list_id: 'endpoint_trusted_apps',
          meta: undefined,
          name: 'windows trusted app 1',
          namespace_type: 'agnostic',
          os_types: ['windows'],
          tags: [],
          type: 'simple',
          tie_breaker_id: '123',
          updated_at: '11/11/2011T11:11:11.111',
          updated_by: 'admin',
        },
        {
          id: '123',
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          name: 'windows trusted app 1',
          description: 'Windows trusted app 1',
          os: 'windows',
          entries: [
            createConditionEntry(
              ConditionEntryField.HASH,
              'F635DA96124659AF249DDF3E40864E9FB234234659AF249DDF3E40864E9FB241'
            ),
            createConditionEntry(ConditionEntryField.PATH, 'C:\\Program Files\\Malware'),
            createConditionEntry(ConditionEntryField.SIGNER, 'Microsoft Windows'),
          ],
        }
      );
    });
  });
});
