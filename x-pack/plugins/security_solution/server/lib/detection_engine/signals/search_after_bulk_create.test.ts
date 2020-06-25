/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  sampleRuleAlertParams,
  sampleEmptyDocSearchResults,
  sampleRuleGuid,
  mockLogger,
  repeatedSearchResultsWithSortId,
} from './__mocks__/es_results';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { DEFAULT_SIGNALS_INDEX } from '../../../../common/constants';
import { alertsMock, AlertServicesMock } from '../../../../../alerts/server/mocks';
import uuid from 'uuid';
import { getListItemResponseMock } from '../../../../../lists/common/schemas/response/list_item_schema.mock';
import { listMock } from '../../../../../lists/server/mocks';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';

describe('searchAfterAndBulkCreate', () => {
  let mockService: AlertServicesMock;
  let inputIndexPattern: string[] = [];
  let listClient = listMock.getListClient();
  const someGuids = Array.from({ length: 13 }).map(() => uuid.v4());
  beforeEach(() => {
    jest.clearAllMocks();
    listClient = listMock.getListClient();
    listClient.getListItemByValues = jest.fn().mockResolvedValue([]);
    inputIndexPattern = ['auditbeat-*'];
    mockService = alertsMock.createAlertServices();
  });

  test('should return success with number of searches less than max signals', async () => {
    const sampleParams = sampleRuleAlertParams(30);
    mockService.callCluster
      .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3)))
      .mockResolvedValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
          {
            create: {
              status: 201,
            },
          },
        ],
      })
      .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6)))
      .mockResolvedValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
          {
            create: {
              status: 201,
            },
          },
        ],
      })
      .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9)))
      .mockResolvedValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
          {
            create: {
              status: 201,
            },
          },
        ],
      })
      .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(9, 12)))
      .mockResolvedValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
          {
            create: {
              status: 201,
            },
          },
        ],
      });
    const exceptionItem = getExceptionListItemSchemaMock();
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
    ];

    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      ruleParams: sampleParams,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      refresh: false,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    expect(success).toEqual(true);
    expect(mockService.callCluster).toHaveBeenCalledTimes(8);
    expect(createdSignalsCount).toEqual(4);
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success when no search results are in the allowlist', async () => {
    const sampleParams = sampleRuleAlertParams(30);
    mockService.callCluster
      .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3)))
      .mockResolvedValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
          {
            create: {
              status: 201,
            },
          },
          {
            create: {
              status: 201,
            },
          },
          {
            create: {
              status: 201,
            },
          },
          {
            create: {
              status: 201,
            },
          },
        ],
      });
    const exceptionItem = getExceptionListItemSchemaMock();
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
    ];
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      ruleParams: sampleParams,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      refresh: false,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    expect(success).toEqual(true);
    expect(mockService.callCluster).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(4); // should not create any signals because all events were in the allowlist
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success when no exceptions list provided', async () => {
    const sampleParams = sampleRuleAlertParams(30);
    mockService.callCluster
      .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3)))
      .mockResolvedValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
          {
            create: {
              status: 201,
            },
          },
          {
            create: {
              status: 201,
            },
          },
          {
            create: {
              status: 201,
            },
          },
          {
            create: {
              status: 201,
            },
          },
        ],
      });

    listClient.getListItemByValues = jest.fn(({ value }) =>
      Promise.resolve(
        value.slice(0, 2).map((item) => ({
          ...getListItemResponseMock(),
          value: item,
        }))
      )
    );
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      ruleParams: sampleParams,
      listClient,
      exceptionsList: [],
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      refresh: false,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    expect(success).toEqual(true);
    expect(mockService.callCluster).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(4); // should not create any signals because all events were in the allowlist
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('if unsuccessful first bulk create', async () => {
    const exceptionItem = getExceptionListItemSchemaMock();
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
    ];
    const sampleParams = sampleRuleAlertParams(10);
    mockService.callCluster
      .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3)))
      .mockRejectedValue(new Error('bulk failed')); // Added this recently
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      listClient,
      exceptionsList: [exceptionItem],
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      refresh: false,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    expect(mockLogger.error).toHaveBeenCalled();
    expect(success).toEqual(false);
    expect(createdSignalsCount).toEqual(0);
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success with 0 total hits', async () => {
    const exceptionItem = getExceptionListItemSchemaMock();
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
    ];
    const sampleParams = sampleRuleAlertParams();
    mockService.callCluster.mockResolvedValueOnce(sampleEmptyDocSearchResults());
    listClient.getListItemByValues = jest.fn(({ value }) =>
      Promise.resolve(
        value.slice(0, 2).map((item) => ({
          ...getListItemResponseMock(),
          value: item,
        }))
      )
    );
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      listClient,
      exceptionsList: [exceptionItem],
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      refresh: false,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    expect(success).toEqual(true);
    expect(createdSignalsCount).toEqual(0);
    expect(lastLookBackDate).toEqual(null);
  });

  test('if returns false when singleSearchAfter throws an exception', async () => {
    const sampleParams = sampleRuleAlertParams(10);
    mockService.callCluster
      .mockResolvedValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
          {
            create: {
              status: 201,
            },
          },
        ],
      })
      .mockImplementation(() => {
        throw Error('Fake Error');
      });
    listClient.getListItemByValues = jest.fn(({ value }) =>
      Promise.resolve(
        value.slice(0, 2).map((item) => ({
          ...getListItemResponseMock(),
          value: item,
        }))
      )
    );
    const exceptionItem = getExceptionListItemSchemaMock();
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
    ];
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      listClient,
      exceptionsList: [exceptionItem],
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      refresh: false,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    expect(success).toEqual(false);
    expect(createdSignalsCount).toEqual(0); // should not create signals if search threw error
    expect(lastLookBackDate).toEqual(null);
  });
});
