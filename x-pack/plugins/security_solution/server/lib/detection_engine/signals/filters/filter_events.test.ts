/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sampleDocWithSortId } from '../__mocks__/es_results';

import { listMock } from '@kbn/lists-plugin/server/mocks';
import { getSearchListItemResponseMock } from '@kbn/lists-plugin/common/schemas/response/search_list_item_schema.mock';
import { filterEvents } from './filter_events';
import { FieldSet } from './types';

describe('filterEvents', () => {
  let listClient = listMock.getListClient();
  let events = [sampleDocWithSortId('123', undefined, '1.1.1.1')];

  beforeEach(() => {
    jest.clearAllMocks();
    listClient = listMock.getListClient();
    listClient.searchListItemByValues = jest.fn(({ value }) =>
      Promise.resolve(
        value.map((item) => ({
          ...getSearchListItemResponseMock(),
          value: item,
        }))
      )
    );
    events = [sampleDocWithSortId('123', undefined, '1.1.1.1')];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it filters out the event if it is "included"', () => {
    events = [sampleDocWithSortId('123', undefined, '1.1.1.1')];
    const fieldAndSetTuples: FieldSet[] = [
      {
        field: 'source.ip',
        operator: 'included',
        matchedSet: new Set([JSON.stringify(['1.1.1.1'])]),
      },
    ];
    const field = filterEvents({
      events,
      fieldAndSetTuples,
    });
    expect([...field]).toEqual([]);
  });

  test('it does not filter out the event if it is "excluded"', () => {
    events = [sampleDocWithSortId('123', undefined, '1.1.1.1')];
    const fieldAndSetTuples: FieldSet[] = [
      {
        field: 'source.ip',
        operator: 'excluded',
        matchedSet: new Set([JSON.stringify(['1.1.1.1'])]),
      },
    ];
    const field = filterEvents({
      events,
      fieldAndSetTuples,
    });
    expect([...field]).toEqual(events);
  });

  test('it does NOT filter out the event if the field is not found', () => {
    events = [sampleDocWithSortId('123', undefined, '1.1.1.1')];
    const fieldAndSetTuples: FieldSet[] = [
      {
        field: 'madeup.nonexistent', // field does not exist
        operator: 'included',
        matchedSet: new Set([JSON.stringify(['1.1.1.1'])]),
      },
    ];
    const field = filterEvents({
      events,
      fieldAndSetTuples,
    });
    expect([...field]).toEqual(events);
  });

  test('it does NOT filter out the event if it is in both an inclusion and exclusion list', () => {
    events = [
      sampleDocWithSortId('123', undefined, '1.1.1.1'),
      sampleDocWithSortId('123', undefined, '2.2.2.2'),
    ];
    const fieldAndSetTuples: FieldSet[] = [
      {
        field: 'source.ip',
        operator: 'included',
        matchedSet: new Set([JSON.stringify(['1.1.1.1'])]),
      },
      {
        field: 'source.ip',
        operator: 'excluded',
        matchedSet: new Set([JSON.stringify(['1.1.1.1'])]),
      },
    ];

    const field = filterEvents({
      events,
      fieldAndSetTuples,
    });
    expect([...field]).toEqual(events);
  });
});
