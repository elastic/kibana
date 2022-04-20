/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFieldAndSetTuples } from './create_field_and_set_tuples';
import { mockLogger, sampleDocWithSortId } from '../__mocks__/es_results';

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { listMock } from '@kbn/lists-plugin/server/mocks';
import { getSearchListItemResponseMock } from '@kbn/lists-plugin/common/schemas/response/search_list_item_schema.mock';
import type { EntryList } from '@kbn/securitysolution-io-ts-list-types';
import { buildRuleMessageMock as buildRuleMessage } from '../rule_messages.mock';

describe('filterEventsAgainstList', () => {
  let listClient = listMock.getListClient();
  let exceptionItem = getExceptionListItemSchemaMock();
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
    exceptionItem = {
      ...getExceptionListItemSchemaMock(),
      entries: [
        {
          field: 'source.ip',
          operator: 'included',
          type: 'list',
          list: {
            id: 'ci-badguys.txt',
            type: 'ip',
          },
        },
      ],
    };
    events = [sampleDocWithSortId('123', undefined, '1.1.1.1')];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns an empty array if exceptionItem entries are empty', async () => {
    exceptionItem.entries = [];
    const field = await createFieldAndSetTuples({
      listClient,
      logger: mockLogger,
      events,
      exceptionItem,
      buildRuleMessage,
    });
    expect(field).toEqual([]);
  });

  test('it returns a single field and set tuple if entries has a single item', async () => {
    const field = await createFieldAndSetTuples({
      listClient,
      logger: mockLogger,
      events,
      exceptionItem,
      buildRuleMessage,
    });
    expect(field.length).toEqual(1);
  });

  test('it returns "included" if the operator is "included"', async () => {
    (exceptionItem.entries[0] as EntryList).operator = 'included';
    const [{ operator }] = await createFieldAndSetTuples({
      listClient,
      logger: mockLogger,
      events,
      exceptionItem,
      buildRuleMessage,
    });
    expect(operator).toEqual('included');
  });

  test('it returns "excluded" if the operator is "excluded"', async () => {
    (exceptionItem.entries[0] as EntryList).operator = 'excluded';
    const [{ operator }] = await createFieldAndSetTuples({
      listClient,
      logger: mockLogger,
      events,
      exceptionItem,
      buildRuleMessage,
    });
    expect(operator).toEqual('excluded');
  });

  test('it returns "field" if the "field is "source.ip"', async () => {
    (exceptionItem.entries[0] as EntryList).field = 'source.ip';
    const [{ field }] = await createFieldAndSetTuples({
      listClient,
      logger: mockLogger,
      events,
      exceptionItem,
      buildRuleMessage,
    });
    expect(field).toEqual('source.ip');
  });

  test('it returns a single matched set as a JSON.stringify() set from the "events"', async () => {
    events = [sampleDocWithSortId('123', undefined, '1.1.1.1')];
    (exceptionItem.entries[0] as EntryList).field = 'source.ip';
    const [{ matchedSet }] = await createFieldAndSetTuples({
      listClient,
      logger: mockLogger,
      events,
      exceptionItem,
      buildRuleMessage,
    });
    expect([...matchedSet]).toEqual([JSON.stringify(['1.1.1.1'])]);
  });

  test('it returns two matched sets as a JSON.stringify() set from the "events"', async () => {
    events = [
      sampleDocWithSortId('123', undefined, '1.1.1.1'),
      sampleDocWithSortId('456', undefined, '2.2.2.2'),
    ];
    (exceptionItem.entries[0] as EntryList).field = 'source.ip';
    const [{ matchedSet }] = await createFieldAndSetTuples({
      listClient,
      logger: mockLogger,
      events,
      exceptionItem,
      buildRuleMessage,
    });
    expect([...matchedSet]).toEqual([JSON.stringify(['1.1.1.1']), JSON.stringify(['2.2.2.2'])]);
  });

  test('it returns an array as a set as a JSON.stringify() array from the "events"', async () => {
    events = [sampleDocWithSortId('123', undefined, ['1.1.1.1', '2.2.2.2'])];
    (exceptionItem.entries[0] as EntryList).field = 'source.ip';
    const [{ matchedSet }] = await createFieldAndSetTuples({
      listClient,
      logger: mockLogger,
      events,
      exceptionItem,
      buildRuleMessage,
    });
    expect([...matchedSet]).toEqual([JSON.stringify(['1.1.1.1', '2.2.2.2'])]);
  });

  test('it returns 2 fields when given two exception list items', async () => {
    events = [
      sampleDocWithSortId('123', undefined, '1.1.1.1'),
      sampleDocWithSortId('456', undefined, '2.2.2.2'),
    ];
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
      {
        field: 'destination.ip',
        operator: 'excluded',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
    ];
    const fields = await createFieldAndSetTuples({
      listClient,
      logger: mockLogger,
      events,
      exceptionItem,
      buildRuleMessage,
    });
    expect(fields.length).toEqual(2);
  });

  test('it returns two matched sets from two different events, one excluded, and one included', async () => {
    events = [
      sampleDocWithSortId('123', undefined, '1.1.1.1'),
      sampleDocWithSortId('456', undefined, '2.2.2.2'),
    ];
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
      {
        field: 'destination.ip',
        operator: 'excluded',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
    ];
    const [{ operator: operator1 }, { operator: operator2 }] = await createFieldAndSetTuples({
      listClient,
      logger: mockLogger,
      events,
      exceptionItem,
      buildRuleMessage,
    });
    expect(operator1).toEqual('included');
    expect(operator2).toEqual('excluded');
  });

  test('it returns two fields from two different events', async () => {
    events = [
      sampleDocWithSortId('123', undefined, '1.1.1.1'),
      sampleDocWithSortId('456', undefined, '2.2.2.2'),
    ];
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
      {
        field: 'destination.ip',
        operator: 'excluded',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
    ];
    const [{ field: field1 }, { field: field2 }] = await createFieldAndSetTuples({
      listClient,
      logger: mockLogger,
      events,
      exceptionItem,
      buildRuleMessage,
    });
    expect(field1).toEqual('source.ip');
    expect(field2).toEqual('destination.ip');
  });

  test('it returns two matches from two different events', async () => {
    events = [
      sampleDocWithSortId('123', undefined, '1.1.1.1', '3.3.3.3'),
      sampleDocWithSortId('456', undefined, '2.2.2.2', '5.5.5.5'),
    ];
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
      {
        field: 'destination.ip',
        operator: 'excluded',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
    ];
    const [{ matchedSet: matchedSet1 }, { matchedSet: matchedSet2 }] =
      await createFieldAndSetTuples({
        listClient,
        logger: mockLogger,
        events,
        exceptionItem,
        buildRuleMessage,
      });
    expect([...matchedSet1]).toEqual([JSON.stringify(['1.1.1.1']), JSON.stringify(['2.2.2.2'])]);
    expect([...matchedSet2]).toEqual([JSON.stringify(['3.3.3.3']), JSON.stringify(['5.5.5.5'])]);
  });
});
