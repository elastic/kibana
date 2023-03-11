/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertFieldSpecToFieldOption } from './util';

describe('convertFieldSpecToFieldOption', () => {
  test('should correctly convert FieldSpec to FieldOption', () => {
    expect(
      convertFieldSpecToFieldOption([
        {
          count: 0,
          name: '@timestamp',
          type: 'date',
          esTypes: ['date'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          shortDotsEnable: false,
          isMapped: true,
        },
        {
          count: 0,
          name: 'ecs.version',
          type: 'string',
          esTypes: ['keyword'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          shortDotsEnable: false,
          isMapped: true,
        },
        {
          count: 0,
          name: 'error.message',
          type: 'string',
          esTypes: ['text'],
          scripted: false,
          searchable: true,
          aggregatable: false,
          readFromDocValues: false,
          shortDotsEnable: false,
          isMapped: true,
        },
        {
          count: 0,
          name: 'event.duration',
          type: 'number',
          esTypes: ['long'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          shortDotsEnable: false,
          isMapped: true,
        },
        {
          count: 0,
          name: 'event.risk_score',
          type: 'number',
          esTypes: ['float'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          shortDotsEnable: false,
          isMapped: true,
        },
        {
          count: 0,
          name: 'user.name',
          type: 'string',
          esTypes: ['keyword'],
          scripted: false,
          searchable: false,
          aggregatable: false,
          readFromDocValues: true,
          shortDotsEnable: false,
          isMapped: false,
        },
      ])
    ).toEqual([
      {
        name: '@timestamp',
        type: 'date',
        normalizedType: 'date',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'ecs.version',
        type: 'keyword',
        normalizedType: 'keyword',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'error.message',
        type: 'text',
        normalizedType: 'text',
        aggregatable: false,
        searchable: true,
      },
      {
        name: 'event.duration',
        type: 'long',
        normalizedType: 'number',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'event.risk_score',
        type: 'float',
        normalizedType: 'number',
        aggregatable: true,
        searchable: true,
      },
    ]);
  });
});
