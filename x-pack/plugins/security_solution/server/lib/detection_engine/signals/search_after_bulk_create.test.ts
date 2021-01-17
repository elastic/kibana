/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import {
  sampleRuleAlertParams,
  sampleEmptyDocSearchResults,
  sampleRuleGuid,
  mockLogger,
  repeatedSearchResultsWithSortId,
  repeatedSearchResultsWithNoSortId,
  sampleDocSearchResultsNoSortIdNoHits,
} from './__mocks__/es_results';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { buildRuleMessageFactory } from './rule_messages';
import { DEFAULT_SIGNALS_INDEX } from '../../../../common/constants';
import { alertsMock, AlertServicesMock } from '../../../../../alerts/server/mocks';
import uuid from 'uuid';
import { listMock } from '../../../../../lists/server/mocks';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { BulkResponse } from './types';
import { SearchListItemArraySchema } from '../../../../../lists/common/schemas';
import { getSearchListItemResponseMock } from '../../../../../lists/common/schemas/response/search_list_item_schema.mock';

const buildRuleMessage = buildRuleMessageFactory({
  id: 'fake id',
  ruleId: 'fake rule id',
  index: 'fakeindex',
  name: 'fake name',
});

describe('searchAfterAndBulkCreate', () => {
  let mockService: AlertServicesMock;
  let inputIndexPattern: string[] = [];
  let listClient = listMock.getListClient();
  const someGuids = Array.from({ length: 13 }).map(() => uuid.v4());
  beforeEach(() => {
    jest.clearAllMocks();
    listClient = listMock.getListClient();
    listClient.searchListItemByValues = jest.fn().mockResolvedValue([]);
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
            create: {
              status: 201,
            },
          },
        ],
      })
      .mockResolvedValueOnce(sampleDocSearchResultsNoSortIdNoHits());

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
      gap: null,
      previousStartedAt: new Date(),
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
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
      buildRuleMessage,
    });
    expect(success).toEqual(true);
    expect(mockService.callCluster).toHaveBeenCalledTimes(9);
    expect(createdSignalsCount).toEqual(4);
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success with number of searches less than max signals with gap', async () => {
    const sampleParams = sampleRuleAlertParams(30);
    mockService.callCluster
      .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3)))
      .mockResolvedValueOnce({
        took: 100,
        errors: false,
        items: [
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
            create: {
              status: 201,
            },
          },
        ],
      })
      .mockResolvedValueOnce(sampleDocSearchResultsNoSortIdNoHits());

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
      gap: moment.duration(2, 'm'),
      previousStartedAt: moment().subtract(10, 'm').toDate(),
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
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
      buildRuleMessage,
    });
    expect(success).toEqual(true);
    expect(mockService.callCluster).toHaveBeenCalledTimes(7);
    expect(createdSignalsCount).toEqual(3);
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
      })
      .mockResolvedValueOnce(sampleDocSearchResultsNoSortIdNoHits());

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
      gap: null,
      previousStartedAt: new Date(),
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
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
      buildRuleMessage,
    });
    expect(success).toEqual(true);
    expect(mockService.callCluster).toHaveBeenCalledTimes(3);
    expect(createdSignalsCount).toEqual(4); // should not create any signals because all events were in the allowlist
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success when all search results are in the allowlist and with sortId present', async () => {
    const searchListItems: SearchListItemArraySchema = [
      { ...getSearchListItemResponseMock(), value: '1.1.1.1' },
      { ...getSearchListItemResponseMock(), value: '2.2.2.2' },
      { ...getSearchListItemResponseMock(), value: '3.3.3.3' },
    ];
    listClient.searchListItemByValues = jest.fn().mockResolvedValue(searchListItems);
    const sampleParams = sampleRuleAlertParams(30);
    mockService.callCluster
      .mockResolvedValueOnce(
        repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3), [
          '1.1.1.1',
          '2.2.2.2',
          '2.2.2.2',
          '2.2.2.2',
        ])
      )
      .mockResolvedValueOnce(sampleDocSearchResultsNoSortIdNoHits());

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
      gap: null,
      previousStartedAt: new Date(),
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
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
      buildRuleMessage,
    });
    expect(success).toEqual(true);
    expect(mockService.callCluster).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(0); // should not create any signals because all events were in the allowlist
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success when all search results are in the allowlist and no sortId present', async () => {
    const searchListItems: SearchListItemArraySchema = [
      { ...getSearchListItemResponseMock(), value: '1.1.1.1' },
      { ...getSearchListItemResponseMock(), value: '2.2.2.2' },
      { ...getSearchListItemResponseMock(), value: '2.2.2.2' },
      { ...getSearchListItemResponseMock(), value: '2.2.2.2' },
    ];

    listClient.searchListItemByValues = jest.fn().mockResolvedValue(searchListItems);
    const sampleParams = sampleRuleAlertParams(30);
    mockService.callCluster.mockResolvedValueOnce(
      repeatedSearchResultsWithNoSortId(4, 4, someGuids.slice(0, 3), [
        '1.1.1.1',
        '2.2.2.2',
        '2.2.2.2',
        '2.2.2.2',
      ])
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
      ruleParams: sampleParams,
      gap: null,
      previousStartedAt: new Date(),
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
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
      buildRuleMessage,
    });
    expect(success).toEqual(true);
    expect(mockService.callCluster).toHaveBeenCalledTimes(1);
    expect(createdSignalsCount).toEqual(0); // should not create any signals because all events were in the allowlist
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
    // I don't like testing log statements since logs change but this is the best
    // way I can think of to ensure this section is getting hit with this test case.
    expect(((mockLogger.debug as unknown) as jest.Mock).mock.calls[8][0]).toContain(
      'ran out of sort ids to sort on name: "fake name" id: "fake id" rule id: "fake rule id" signals index: "fakeindex"'
    );
  });

  test('should return success when no sortId present but search results are in the allowlist', async () => {
    const sampleParams = sampleRuleAlertParams(30);
    mockService.callCluster
      .mockResolvedValueOnce(repeatedSearchResultsWithNoSortId(4, 4, someGuids.slice(0, 3)))
      .mockResolvedValueOnce({
        took: 100,
        errors: false,
        items: [
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
      gap: null,
      previousStartedAt: new Date(),
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
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
      buildRuleMessage,
    });
    expect(success).toEqual(true);
    expect(mockService.callCluster).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(4); // should not create any signals because all events were in the allowlist
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
    // I don't like testing log statements since logs change but this is the best
    // way I can think of to ensure this section is getting hit with this test case.
    expect(((mockLogger.debug as unknown) as jest.Mock).mock.calls[15][0]).toContain(
      'ran out of sort ids to sort on name: "fake name" id: "fake id" rule id: "fake rule id" signals index: "fakeindex"'
    );
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
      })
      .mockResolvedValueOnce(sampleDocSearchResultsNoSortIdNoHits());

    listClient.searchListItemByValues = jest.fn(({ value }) =>
      Promise.resolve(
        value.slice(0, 2).map((item) => ({
          ...getSearchListItemResponseMock(),
          value: item,
        }))
      )
    );
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      ruleParams: sampleParams,
      gap: null,
      previousStartedAt: new Date(),
      listClient,
      exceptionsList: [],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
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
      buildRuleMessage,
    });
    expect(success).toEqual(true);
    expect(mockService.callCluster).toHaveBeenCalledTimes(3);
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
      gap: null,
      previousStartedAt: new Date(),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
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
      buildRuleMessage,
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
    const sampleParams = sampleRuleAlertParams(30);
    mockService.callCluster.mockResolvedValueOnce(sampleEmptyDocSearchResults());
    listClient.searchListItemByValues = jest.fn(({ value }) =>
      Promise.resolve(
        value.slice(0, 2).map((item) => ({
          ...getSearchListItemResponseMock(),
          value: item,
        }))
      )
    );
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      listClient,
      exceptionsList: [exceptionItem],
      gap: null,
      previousStartedAt: new Date(),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
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
      buildRuleMessage,
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
            create: {
              status: 201,
            },
          },
        ],
      })
      .mockImplementation(() => {
        throw Error('Fake Error'); // throws the exception we are testing
      });
    listClient.searchListItemByValues = jest.fn(({ value }) =>
      Promise.resolve(
        value.slice(0, 2).map((item) => ({
          ...getSearchListItemResponseMock(),
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
      gap: null,
      previousStartedAt: new Date(),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
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
      buildRuleMessage,
    });
    expect(success).toEqual(false);
    expect(createdSignalsCount).toEqual(0); // should not create signals if search threw error
    expect(lastLookBackDate).toEqual(null);
  });

  test('it returns error array when singleSearchAfter returns errors', async () => {
    const sampleParams = sampleRuleAlertParams(30);
    const bulkItem: BulkResponse = {
      took: 100,
      errors: true,
      items: [
        {
          create: {
            _version: 1,
            _index: 'index-123',
            _id: 'id-123',
            status: 201,
            error: {
              type: 'network',
              reason: 'error on creation',
              shard: 'shard-123',
              index: 'index-123',
            },
          },
        },
      ],
    };
    mockService.callCluster
      .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3)))
      .mockResolvedValueOnce(bulkItem) // adds the response with errors we are testing
      .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6)))
      .mockResolvedValueOnce({
        took: 100,
        errors: false,
        items: [
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
            create: {
              status: 201,
            },
          },
        ],
      })
      .mockResolvedValueOnce(sampleDocSearchResultsNoSortIdNoHits());

    const {
      success,
      createdSignalsCount,
      lastLookBackDate,
      errors,
    } = await searchAfterAndBulkCreate({
      ruleParams: sampleParams,
      gap: null,
      previousStartedAt: new Date(),
      listClient,
      exceptionsList: [],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
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
      buildRuleMessage,
    });
    expect(success).toEqual(false);
    expect(errors).toEqual(['error on creation']);
    expect(mockService.callCluster).toHaveBeenCalledTimes(9);
    expect(createdSignalsCount).toEqual(4);
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });
});
