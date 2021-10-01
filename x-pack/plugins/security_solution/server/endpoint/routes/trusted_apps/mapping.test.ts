/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateExceptionListItemOptions } from '../../../../../lists/server';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import {
  ConditionEntryField,
  NewTrustedApp,
  OperatingSystem,
  TrustedApp,
  UpdateTrustedApp,
} from '../../../../common/endpoint/types';

import {
  createConditionEntry,
  createEntryMatch,
  createEntryNested,
  exceptionListItemToTrustedApp,
  newTrustedAppToCreateExceptionListItemOptions,
  updatedTrustedAppToUpdateExceptionListItemOptions,
} from './mapping';

const createExceptionListItemOptions = (
  options: Partial<CreateExceptionListItemOptions>
): CreateExceptionListItemOptions => ({
  comments: [],
  description: '',
  entries: [],
  itemId: expect.any(String),
  listId: 'endpoint_trusted_apps',
  meta: undefined,
  name: '',
  namespaceType: 'agnostic',
  osTypes: [],
  tags: ['policy:all'],
  type: 'simple',
  ...options,
});

const exceptionListItemSchema = (
  item: Partial<ExceptionListItemSchema>
): ExceptionListItemSchema => ({
  _version: 'abc123',
  id: '',
  comments: [],
  created_at: '',
  created_by: '',
  description: '',
  entries: [],
  item_id: '123',
  list_id: 'endpoint_trusted_apps',
  meta: undefined,
  name: '',
  namespace_type: 'agnostic',
  os_types: [],
  tags: ['policy:all'],
  type: 'simple',
  tie_breaker_id: '123',
  updated_at: '11/11/2011T11:11:11.111',
  updated_by: 'admin',
  ...(item || {}),
});

describe('mapping', () => {
  describe('newTrustedAppToCreateExceptionListItemOptions', () => {
    const testMapping = (input: NewTrustedApp, expectedResult: CreateExceptionListItemOptions) => {
      expect(newTrustedAppToCreateExceptionListItemOptions(input)).toEqual(expectedResult);
    };

    it('should map linux trusted app condition properly', function () {
      testMapping(
        {
          name: 'linux trusted app',
          description: 'Linux Trusted App',
          effectScope: { type: 'global' },
          os: OperatingSystem.LINUX,
          entries: [createConditionEntry(ConditionEntryField.PATH, 'match', '/bin/malware')],
        },
        createExceptionListItemOptions({
          name: 'linux trusted app',
          description: 'Linux Trusted App',
          osTypes: ['linux'],
          entries: [
            createEntryMatch(
              'process.executable.caseless',

              '/bin/malware'
            ),
          ],
        })
      );
    });

    it('should map macos trusted app condition properly', function () {
      testMapping(
        {
          name: 'macos trusted app',
          description: 'MacOS Trusted App',
          effectScope: { type: 'global' },
          os: OperatingSystem.MAC,
          entries: [createConditionEntry(ConditionEntryField.PATH, 'match', '/bin/malware')],
        },
        createExceptionListItemOptions({
          name: 'macos trusted app',
          description: 'MacOS Trusted App',
          osTypes: ['macos'],
          entries: [
            createEntryMatch(
              'process.executable.caseless',

              '/bin/malware'
            ),
          ],
        })
      );
    });

    it('should map windows trusted app condition properly', function () {
      testMapping(
        {
          name: 'windows trusted app',
          description: 'Windows Trusted App',
          effectScope: { type: 'global' },
          os: OperatingSystem.WINDOWS,
          entries: [
            createConditionEntry(ConditionEntryField.PATH, 'match', 'C:\\Program Files\\Malware'),
          ],
        },
        createExceptionListItemOptions({
          name: 'windows trusted app',
          description: 'Windows Trusted App',
          osTypes: ['windows'],
          entries: [
            createEntryMatch(
              'process.executable.caseless',

              'C:\\Program Files\\Malware'
            ),
          ],
        })
      );
    });

    it('should map signer condition properly', function () {
      testMapping(
        {
          name: 'Signed trusted app',
          description: 'Signed Trusted App',
          effectScope: { type: 'global' },
          os: OperatingSystem.WINDOWS,
          entries: [createConditionEntry(ConditionEntryField.SIGNER, 'match', 'Microsoft Windows')],
        },
        createExceptionListItemOptions({
          name: 'Signed trusted app',
          description: 'Signed Trusted App',
          osTypes: ['windows'],
          entries: [
            createEntryNested('process.Ext.code_signature', [
              createEntryMatch('trusted', 'true'),
              createEntryMatch('subject_name', 'Microsoft Windows'),
            ]),
          ],
        })
      );
    });

    it('should map MD5 hash condition properly', function () {
      testMapping(
        {
          name: 'MD5 trusted app',
          description: 'MD5 Trusted App',
          effectScope: { type: 'global' },
          os: OperatingSystem.LINUX,
          entries: [
            createConditionEntry(
              ConditionEntryField.HASH,
              'match',
              '1234234659af249ddf3e40864e9fb241'
            ),
          ],
        },
        createExceptionListItemOptions({
          name: 'MD5 trusted app',
          description: 'MD5 Trusted App',
          osTypes: ['linux'],
          entries: [
            createEntryMatch(
              'process.hash.md5',

              '1234234659af249ddf3e40864e9fb241'
            ),
          ],
        })
      );
    });

    it('should map SHA1 hash condition properly', function () {
      testMapping(
        {
          name: 'SHA1 trusted app',
          description: 'SHA1 Trusted App',
          effectScope: { type: 'global' },
          os: OperatingSystem.LINUX,
          entries: [
            createConditionEntry(
              ConditionEntryField.HASH,
              'match',
              'f635da961234234659af249ddf3e40864e9fb241'
            ),
          ],
        },
        createExceptionListItemOptions({
          name: 'SHA1 trusted app',
          description: 'SHA1 Trusted App',
          osTypes: ['linux'],
          entries: [
            createEntryMatch(
              'process.hash.sha1',

              'f635da961234234659af249ddf3e40864e9fb241'
            ),
          ],
        })
      );
    });

    it('should map SHA256 hash condition properly', function () {
      testMapping(
        {
          name: 'SHA256 trusted app',
          description: 'SHA256 Trusted App',
          effectScope: { type: 'global' },
          os: OperatingSystem.LINUX,
          entries: [
            createConditionEntry(
              ConditionEntryField.HASH,
              'match',
              'f635da96124659af249ddf3e40864e9fb234234659af249ddf3e40864e9fb241'
            ),
          ],
        },
        createExceptionListItemOptions({
          name: 'SHA256 trusted app',
          description: 'SHA256 Trusted App',
          osTypes: ['linux'],
          entries: [
            createEntryMatch(
              'process.hash.sha256',

              'f635da96124659af249ddf3e40864e9fb234234659af249ddf3e40864e9fb241'
            ),
          ],
        })
      );
    });

    it('should lowercase hash condition value', function () {
      testMapping(
        {
          name: 'MD5 trusted app',
          description: 'MD5 Trusted App',
          effectScope: { type: 'global' },
          os: OperatingSystem.LINUX,
          entries: [
            createConditionEntry(
              ConditionEntryField.HASH,
              'match',
              '1234234659Af249ddf3e40864E9FB241'
            ),
          ],
        },
        createExceptionListItemOptions({
          name: 'MD5 trusted app',
          description: 'MD5 Trusted App',
          osTypes: ['linux'],
          entries: [
            createEntryMatch(
              'process.hash.md5',

              '1234234659af249ddf3e40864e9fb241'
            ),
          ],
        })
      );
    });
  });

  describe('exceptionListItemToTrustedApp', () => {
    const testMapping = (input: ExceptionListItemSchema, expectedResult: TrustedApp) => {
      expect(exceptionListItemToTrustedApp(input)).toEqual(expectedResult);
    };

    it('should map linux exception list item properly', function () {
      testMapping(
        exceptionListItemSchema({
          id: '123',
          name: 'linux trusted app',
          description: 'Linux Trusted App',
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          os_types: ['linux'],
          entries: [
            createEntryMatch(
              'process.executable.caseless',

              '/bin/malware'
            ),
          ],
        }),
        {
          id: '123',
          version: 'abc123',
          name: 'linux trusted app',
          description: 'Linux Trusted App',
          effectScope: { type: 'global' },
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          updated_at: '11/11/2011T11:11:11.111',
          updated_by: 'admin',
          os: OperatingSystem.LINUX,
          entries: [createConditionEntry(ConditionEntryField.PATH, 'match', '/bin/malware')],
        }
      );
    });

    it('should map macos exception list item properly', function () {
      testMapping(
        exceptionListItemSchema({
          id: '123',
          name: 'macos trusted app',
          description: 'MacOS Trusted App',
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          os_types: ['macos'],
          entries: [
            createEntryMatch(
              'process.executable.caseless',

              '/bin/malware'
            ),
          ],
        }),
        {
          id: '123',
          version: 'abc123',
          name: 'macos trusted app',
          description: 'MacOS Trusted App',
          effectScope: { type: 'global' },
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          updated_at: '11/11/2011T11:11:11.111',
          updated_by: 'admin',
          os: OperatingSystem.MAC,
          entries: [createConditionEntry(ConditionEntryField.PATH, 'match', '/bin/malware')],
        }
      );
    });

    it('should map windows exception list item properly', function () {
      testMapping(
        exceptionListItemSchema({
          id: '123',
          name: 'windows trusted app',
          description: 'Windows Trusted App',
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          os_types: ['windows'],
          entries: [
            createEntryMatch(
              'process.executable.caseless',

              'C:\\Program Files\\Malware'
            ),
          ],
        }),
        {
          id: '123',
          version: 'abc123',
          name: 'windows trusted app',
          description: 'Windows Trusted App',
          effectScope: { type: 'global' },
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          updated_at: '11/11/2011T11:11:11.111',
          updated_by: 'admin',
          os: OperatingSystem.WINDOWS,
          entries: [
            createConditionEntry(ConditionEntryField.PATH, 'match', 'C:\\Program Files\\Malware'),
          ],
        }
      );
    });

    it('should map exception list item containing signer entry match properly', function () {
      testMapping(
        exceptionListItemSchema({
          id: '123',
          name: 'signed trusted app',
          description: 'Signed trusted app',
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          os_types: ['windows'],
          entries: [
            createEntryNested('process.Ext.code_signature', [
              createEntryMatch('trusted', 'true'),
              createEntryMatch('subject_name', 'Microsoft Windows'),
            ]),
          ],
        }),
        {
          id: '123',
          version: 'abc123',
          name: 'signed trusted app',
          description: 'Signed trusted app',
          effectScope: { type: 'global' },
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          updated_at: '11/11/2011T11:11:11.111',
          updated_by: 'admin',
          os: OperatingSystem.WINDOWS,
          entries: [createConditionEntry(ConditionEntryField.SIGNER, 'match', 'Microsoft Windows')],
        }
      );
    });

    it('should map exception list item containing MD5 hash entry match properly', function () {
      testMapping(
        exceptionListItemSchema({
          id: '123',
          name: 'MD5 trusted app',
          description: 'MD5 Trusted App',
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          os_types: ['linux'],
          entries: [
            createEntryMatch(
              'process.hash.md5',

              '1234234659af249ddf3e40864e9fb241'
            ),
          ],
        }),
        {
          id: '123',
          version: 'abc123',
          name: 'MD5 trusted app',
          description: 'MD5 Trusted App',
          effectScope: { type: 'global' },
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          updated_at: '11/11/2011T11:11:11.111',
          updated_by: 'admin',
          os: OperatingSystem.LINUX,
          entries: [
            createConditionEntry(
              ConditionEntryField.HASH,
              'match',
              '1234234659af249ddf3e40864e9fb241'
            ),
          ],
        }
      );
    });

    it('should map exception list item containing SHA1 hash entry match properly', function () {
      testMapping(
        exceptionListItemSchema({
          id: '123',
          name: 'SHA1 trusted app',
          description: 'SHA1 Trusted App',
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          os_types: ['linux'],
          entries: [
            createEntryMatch(
              'process.hash.sha1',

              'f635da961234234659af249ddf3e40864e9fb241'
            ),
          ],
        }),
        {
          id: '123',
          version: 'abc123',
          name: 'SHA1 trusted app',
          description: 'SHA1 Trusted App',
          effectScope: { type: 'global' },
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          updated_at: '11/11/2011T11:11:11.111',
          updated_by: 'admin',
          os: OperatingSystem.LINUX,
          entries: [
            createConditionEntry(
              ConditionEntryField.HASH,
              'match',
              'f635da961234234659af249ddf3e40864e9fb241'
            ),
          ],
        }
      );
    });

    it('should map exception list item containing SHA256 hash entry match properly', function () {
      testMapping(
        exceptionListItemSchema({
          id: '123',
          name: 'SHA256 trusted app',
          description: 'SHA256 Trusted App',
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          os_types: ['linux'],
          entries: [
            createEntryMatch(
              'process.hash.sha256',

              'f635da96124659af249ddf3e40864e9fb234234659af249ddf3e40864e9fb241'
            ),
          ],
        }),
        {
          id: '123',
          version: 'abc123',
          name: 'SHA256 trusted app',
          description: 'SHA256 Trusted App',
          effectScope: { type: 'global' },
          created_at: '11/11/2011T11:11:11.111',
          created_by: 'admin',
          updated_at: '11/11/2011T11:11:11.111',
          updated_by: 'admin',
          os: OperatingSystem.LINUX,
          entries: [
            createConditionEntry(
              ConditionEntryField.HASH,
              'match',
              'f635da96124659af249ddf3e40864e9fb234234659af249ddf3e40864e9fb241'
            ),
          ],
        }
      );
    });
  });

  describe('updatedTrustedAppToUpdateExceptionListItemOptions', () => {
    it('should map to UpdateExceptionListItemOptions', () => {
      const updatedTrustedApp: UpdateTrustedApp = {
        name: 'Linux trusted app',
        description: 'Linux Trusted App',
        effectScope: { type: 'global' },
        os: OperatingSystem.LINUX,
        entries: [createConditionEntry(ConditionEntryField.PATH, 'match', '/bin/malware')],
        version: 'abc',
      };

      expect(
        updatedTrustedAppToUpdateExceptionListItemOptions(
          exceptionListItemSchema({ id: 'original-id-here', item_id: 'original-item-id-here' }),
          updatedTrustedApp
        )
      ).toEqual({
        _version: 'abc',
        comments: [],
        description: 'Linux Trusted App',
        entries: [
          {
            field: 'process.executable.caseless',
            operator: 'included',
            type: 'match',
            value: '/bin/malware',
          },
        ],
        id: 'original-id-here',
        itemId: 'original-item-id-here',
        name: 'Linux trusted app',
        namespaceType: 'agnostic',
        osTypes: ['linux'],
        tags: ['policy:all'],
        type: 'simple',
      });
    });
  });
});
