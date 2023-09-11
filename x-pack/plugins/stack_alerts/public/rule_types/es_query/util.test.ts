/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertFieldSpecToFieldOption, convertRawRuntimeFieldtoFieldOption } from './util';

describe('Es Query utils', () => {
  test('should correctly convert FieldSpec to FieldOption', () => {
    expect(
      convertFieldSpecToFieldOption([
        {
          count: 0,
          name: 'day_of_week',
          type: 'string',
          esTypes: ['keyword'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: false,
          shortDotsEnable: false,
          runtimeField: {
            type: 'keyword',
            script: {
              source:
                "emit(doc['@timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))",
            },
          },
        },
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
        name: 'day_of_week',
        type: 'keyword',
        normalizedType: 'keyword',
        aggregatable: true,
        searchable: true,
      },
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

  test('should correctly convert raw runtime field to FieldOption', () => {
    expect(
      convertRawRuntimeFieldtoFieldOption({
        day_of_week: {
          type: 'keyword',
          script: {
            source:
              "emit(doc['@timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))",
          },
        },
        location: {
          type: 'lookup',
          target_index: 'ip_location',
          input_field: 'host',
          target_field: 'ip',
          fetch_fields: ['country', 'city'],
        },
      })
    ).toEqual([
      {
        name: 'day_of_week',
        type: 'keyword',
        normalizedType: 'keyword',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'location',
        type: 'lookup',
        normalizedType: 'lookup',
        aggregatable: false,
        searchable: false,
      },
    ]);
  });

  test('should return an empty array if raw runtime fields are malformed JSON', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawFields: any = null;
    expect(convertRawRuntimeFieldtoFieldOption(rawFields)).toEqual([]);
  });

  test('should not return FieldOption if raw runtime fields do not include the type', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawFields: any = {
      day_of_week: {
        test: 'keyword',
        script: {
          source:
            "emit(doc['@timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))",
        },
      },
    };
    expect(convertRawRuntimeFieldtoFieldOption(rawFields)).toEqual([]);
  });
});
