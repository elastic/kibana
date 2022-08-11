/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import uuid from 'uuid';
import {
  ENDPOINT_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
} from '@kbn/securitysolution-list-constants';

import { ExceptionListSoSchema } from '../schemas/saved_objects';

import { OldExceptionListSoSchema, migrations } from './migrations';

const DEFAULT_EXCEPTION_LIST_SO: ExceptionListSoSchema = {
  comments: undefined,
  created_at: '2020-06-09T20:18:20.349Z',
  created_by: 'user',
  description: 'description',
  entries: undefined,
  immutable: false,
  item_id: undefined,
  list_id: 'some_list',
  list_type: 'list',
  meta: undefined,
  name: 'name',
  os_types: [],
  tags: [],
  tie_breaker_id: uuid.v4(),
  type: 'endpoint',
  updated_by: 'user',
  version: undefined,
};

const DEFAULT_OLD_EXCEPTION_LIST_SO: OldExceptionListSoSchema = {
  ...DEFAULT_EXCEPTION_LIST_SO,
  _tags: [],
};

const createOldExceptionListSoSchemaSavedObject = (
  attributes: Partial<OldExceptionListSoSchema>
): SavedObjectUnsanitizedDoc<OldExceptionListSoSchema> => ({
  attributes: { ...DEFAULT_OLD_EXCEPTION_LIST_SO, ...attributes },
  id: 'abcd',
  migrationVersion: {},
  references: [],
  type: 'so-type',
  updated_at: '2020-06-09T20:18:20.349Z',
});

const createExceptionListSoSchemaSavedObject = (
  attributes: Partial<ExceptionListSoSchema>
): SavedObjectUnsanitizedDoc<ExceptionListSoSchema> => ({
  attributes: { ...DEFAULT_EXCEPTION_LIST_SO, ...attributes },
  id: 'abcd',
  migrationVersion: {},
  references: [],
  type: 'so-type',
  updated_at: '2020-06-09T20:18:20.349Z',
});

describe('7.10.0 lists migrations', () => {
  const migration = migrations['7.10.0'];

  test('properly converts .text fields to .caseless', () => {
    const doc = createOldExceptionListSoSchemaSavedObject({
      entries: [
        {
          field: 'file.path.text',
          operator: 'included',
          type: 'match',
          value: 'C:\\Windows\\explorer.exe',
        },
        {
          field: 'host.os.name',
          operator: 'included',
          type: 'match',
          value: 'my-host',
        },
        {
          entries: [
            {
              field: 'process.command_line.text',
              operator: 'included',
              type: 'match',
              value: '/usr/bin/bash',
            },
            {
              field: 'process.parent.command_line.text',
              operator: 'included',
              type: 'match',
              value: '/usr/bin/bash',
            },
          ],
          field: 'nested.field',
          type: 'nested',
        },
      ],
      list_id: ENDPOINT_LIST_ID,
    });

    expect(migration(doc)).toEqual(
      createOldExceptionListSoSchemaSavedObject({
        entries: [
          {
            field: 'file.path.caseless',
            operator: 'included',
            type: 'match',
            value: 'C:\\Windows\\explorer.exe',
          },
          {
            field: 'host.os.name',
            operator: 'included',
            type: 'match',
            value: 'my-host',
          },
          {
            entries: [
              {
                field: 'process.command_line.caseless',
                operator: 'included',
                type: 'match',
                value: '/usr/bin/bash',
              },
              {
                field: 'process.parent.command_line.caseless',
                operator: 'included',
                type: 'match',
                value: '/usr/bin/bash',
              },
            ],
            field: 'nested.field',
            type: 'nested',
          },
        ],
        list_id: ENDPOINT_LIST_ID,
      })
    );
  });

  test('properly copies os tags to os_types', () => {
    const doc = createOldExceptionListSoSchemaSavedObject({
      _tags: ['1234', 'os:windows'],
      comments: [],
    });

    expect(migration(doc)).toEqual(
      createOldExceptionListSoSchemaSavedObject({
        _tags: ['1234', 'os:windows'],
        comments: [],
        os_types: ['windows'],
      })
    );
  });
});

describe('7.12.0 lists migrations', () => {
  const migration = migrations['7.12.0'];

  test('should not convert non trusted apps lists', () => {
    const doc = createExceptionListSoSchemaSavedObject({ list_id: ENDPOINT_LIST_ID, tags: [] });

    expect(migration(doc)).toEqual(
      createExceptionListSoSchemaSavedObject({
        list_id: ENDPOINT_LIST_ID,
        tags: [],
        tie_breaker_id: expect.anything(),
      })
    );
  });

  test('converts empty tags to contain list containing "policy:all" tag', () => {
    const doc = createExceptionListSoSchemaSavedObject({
      list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
      tags: [],
    });

    expect(migration(doc)).toEqual(
      createExceptionListSoSchemaSavedObject({
        list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
        tags: ['policy:all'],
        tie_breaker_id: expect.anything(),
      })
    );
  });

  test('preserves existing non policy related tags', () => {
    const doc = createExceptionListSoSchemaSavedObject({
      list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
      tags: ['tag1', 'tag2'],
    });

    expect(migration(doc)).toEqual(
      createExceptionListSoSchemaSavedObject({
        list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
        tags: ['tag1', 'tag2', 'policy:all'],
        tie_breaker_id: expect.anything(),
      })
    );
  });

  test('preserves existing "policy:all" tag and does not add another one', () => {
    const doc = createExceptionListSoSchemaSavedObject({
      list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
      tags: ['policy:all', 'tag1', 'tag2'],
    });

    expect(migration(doc)).toEqual(
      createExceptionListSoSchemaSavedObject({
        list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
        tags: ['policy:all', 'tag1', 'tag2'],
        tie_breaker_id: expect.anything(),
      })
    );
  });

  test('preserves existing policy reference tag and does not add "policy:all" tag', () => {
    const doc = createExceptionListSoSchemaSavedObject({
      list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
      tags: ['policy:056d2d4645421fb92e5cd39f33d70856', 'tag1', 'tag2'],
    });

    expect(migration(doc)).toEqual(
      createExceptionListSoSchemaSavedObject({
        list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
        tags: ['policy:056d2d4645421fb92e5cd39f33d70856', 'tag1', 'tag2'],
        tie_breaker_id: expect.anything(),
      })
    );
  });
});
