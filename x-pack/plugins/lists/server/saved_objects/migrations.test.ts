/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectUnsanitizedDoc } from 'kibana/server';

import { ENDPOINT_LIST_ID } from '../../common/constants';

import { OldExceptionListSoSchema, migrations } from './migrations';

describe('7.10.0 lists migrations', () => {
  const migration = migrations['7.10.0'];

  test('properly converts .text fields to .caseless', () => {
    const doc = {
      attributes: {
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
      },
      id: 'abcd',
      migrationVersion: {},
      references: [],
      type: 'so-type',
      updated_at: '2020-06-09T20:18:20.349Z',
    };
    expect(
      migration((doc as unknown) as SavedObjectUnsanitizedDoc<OldExceptionListSoSchema>)
    ).toEqual({
      attributes: {
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
      },
      id: 'abcd',
      migrationVersion: {},
      references: [],
      type: 'so-type',
      updated_at: '2020-06-09T20:18:20.349Z',
    });
  });

  test('properly copies os tags to os_types', () => {
    const doc = {
      attributes: {
        _tags: ['1234', 'os:windows'],
        comments: [],
      },
      id: 'abcd',
      migrationVersion: {},
      references: [],
      type: 'so-type',
      updated_at: '2020-06-09T20:18:20.349Z',
    };
    expect(
      migration((doc as unknown) as SavedObjectUnsanitizedDoc<OldExceptionListSoSchema>)
    ).toEqual({
      attributes: {
        _tags: ['1234', 'os:windows'],
        comments: [],
        os_types: ['windows'],
      },
      id: 'abcd',
      migrationVersion: {},
      references: [],
      type: 'so-type',
      updated_at: '2020-06-09T20:18:20.349Z',
    });
  });
});
