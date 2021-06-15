/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sampleEmptyDocSearchResults,
  sampleRuleGuid,
  sampleRuleSO,
  mockLogger,
  repeatedSearchResultsWithSortId,
  repeatedSearchResultsWithNoSortId,
  sampleDocSearchResultsNoSortIdNoHits,
  sampleDocWithSortId,
} from './__mocks__/es_results';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { DEFAULT_SIGNALS_INDEX } from '../../../../common/constants';
import { alertsMock, AlertServicesMock } from '../../../../../alerting/server/mocks';
import uuid from 'uuid';
import { listMock } from '../../../../../lists/server/mocks';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { BulkCreate, BulkResponse, RuleRangeTuple, WrapHits } from './types';
import type { SearchListItemArraySchema } from '@kbn/securitysolution-io-ts-list-types';
import { getSearchListItemResponseMock } from '../../../../../lists/common/schemas/response/search_list_item_schema.mock';
import { getRuleRangeTuples } from './utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';
import { bulkCreateFactory } from './bulk_create_factory';
import { wrapHitsFactory } from './wrap_hits_factory';
import { mockBuildRuleMessage } from './__mocks__/build_rule_message.mock';

const buildRuleMessage = mockBuildRuleMessage;

describe('searchAfterAndBulkCreate', () => {
  let mockService: AlertServicesMock;
  let bulkCreate: BulkCreate;
  let wrapHits: WrapHits;
  let inputIndexPattern: string[] = [];
  let listClient = listMock.getListClient();
  const someGuids = Array.from({ length: 13 }).map(() => uuid.v4());
  const sampleParams = getQueryRuleParams();
  const ruleSO = sampleRuleSO(getQueryRuleParams());
  sampleParams.maxSignals = 30;
  let tuples: RuleRangeTuple[];
  beforeEach(() => {
    jest.clearAllMocks();
    listClient = listMock.getListClient();
    listClient.searchListItemByValues = jest.fn().mockResolvedValue([]);
    inputIndexPattern = ['auditbeat-*'];
    mockService = alertsMock.createAlertServices();
    ({ tuples } = getRuleRangeTuples({
      logger: mockLogger,
      previousStartedAt: new Date(),
      from: sampleParams.from,
      to: sampleParams.to,
      interval: '5m',
      maxSignals: sampleParams.maxSignals,
      buildRuleMessage,
    }));
    bulkCreate = bulkCreateFactory(
      mockLogger,
      mockService.scopedClusterClient.asCurrentUser,
      buildRuleMessage,
      false
    );
    wrapHits = wrapHitsFactory({ ruleSO, signalsIndex: DEFAULT_SIGNALS_INDEX });
  });

  test('should return success with number of searches less than max signals', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(9, 12))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        sampleDocSearchResultsNoSortIdNoHits()
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
      tuples,
      ruleSO,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(true);
    expect(mockService.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(5);
    expect(createdSignalsCount).toEqual(4);
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success with number of searches less than max signals with gap', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3))
      )
    );
    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        sampleDocSearchResultsNoSortIdNoHits()
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
      ruleSO,
      tuples,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(true);
    expect(mockService.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(4);
    expect(createdSignalsCount).toEqual(3);
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success when no search results are in the allowlist', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        sampleDocSearchResultsNoSortIdNoHits()
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
      ruleSO,
      tuples,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(true);
    expect(mockService.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(4);
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success when all search results are in the allowlist and with sortId present', async () => {
    const searchListItems: SearchListItemArraySchema = [
      { ...getSearchListItemResponseMock(), value: ['1.1.1.1'] },
      { ...getSearchListItemResponseMock(), value: ['2.2.2.2'] },
      { ...getSearchListItemResponseMock(), value: ['3.3.3.3'] },
    ];
    listClient.searchListItemByValues = jest.fn().mockResolvedValue(searchListItems);
    mockService.scopedClusterClient.asCurrentUser.search
      .mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3), [
            '1.1.1.1',
            '2.2.2.2',
            '2.2.2.2',
            '2.2.2.2',
          ])
        )
      )
      .mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          sampleDocSearchResultsNoSortIdNoHits()
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
      ruleSO,
      tuples,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(true);
    expect(mockService.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(0); // should not create any signals because all events were in the allowlist
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success when empty string sortId present', async () => {
    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        took: 100,
        errors: false,
        items: [
          {
            create: {
              _id: someGuids[0],
              _index: 'myfakeindex',
              status: 201,
            },
          },
          {
            create: {
              _id: someGuids[1],
              _index: 'myfakeindex',
              status: 201,
            },
          },
          {
            create: {
              _id: someGuids[2],
              _index: 'myfakeindex',
              status: 201,
            },
          },
          {
            create: {
              _id: someGuids[3],
              _index: 'myfakeindex',
              status: 201,
            },
          },
        ],
      })
    );
    mockService.scopedClusterClient.asCurrentUser.search
      .mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          repeatedSearchResultsWithSortId(
            4,
            4,
            someGuids.slice(0, 3),
            ['1.1.1.1', '2.2.2.2', '2.2.2.2', '2.2.2.2'],
            // this is the case we are testing, if we receive an empty string for one of the sort ids.
            ['', '2222222222222']
          )
        )
      )
      .mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          sampleDocSearchResultsNoSortIdNoHits()
        )
      );

    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      ruleSO,
      tuples,
      listClient,
      exceptionsList: [],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(true);
    expect(mockService.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(4);
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success when all search results are in the allowlist and no sortId present', async () => {
    const searchListItems: SearchListItemArraySchema = [
      { ...getSearchListItemResponseMock(), value: ['1.1.1.1'] },
      { ...getSearchListItemResponseMock(), value: ['2.2.2.2'] },
      { ...getSearchListItemResponseMock(), value: ['2.2.2.2'] },
      { ...getSearchListItemResponseMock(), value: ['2.2.2.2'] },
    ];

    listClient.searchListItemByValues = jest.fn().mockResolvedValue(searchListItems);
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithNoSortId(4, 4, someGuids.slice(0, 3), [
          '1.1.1.1',
          '2.2.2.2',
          '2.2.2.2',
          '2.2.2.2',
        ])
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
      ruleSO,
      tuples,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(true);
    expect(mockService.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
    expect(createdSignalsCount).toEqual(0); // should not create any signals because all events were in the allowlist
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
    // I don't like testing log statements since logs change but this is the best
    // way I can think of to ensure this section is getting hit with this test case.
    expect(((mockLogger.debug as unknown) as jest.Mock).mock.calls[7][0]).toContain(
      'ran out of sort ids to sort on name: "fake name" id: "fake id" rule id: "fake rule id" signals index: "fakeindex"'
    );
  });

  test('should return success when no sortId present but search results are in the allowlist', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithNoSortId(4, 4, someGuids.slice(0, 3))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
      ruleSO,
      tuples,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(true);
    expect(mockService.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
    expect(createdSignalsCount).toEqual(4);
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success when no exceptions list provided', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        sampleDocSearchResultsNoSortIdNoHits()
      )
    );

    listClient.searchListItemByValues = jest.fn(({ value }) =>
      Promise.resolve(
        value.slice(0, 2).map((item) => ({
          ...getSearchListItemResponseMock(),
          value: item,
        }))
      )
    );
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      ruleSO,
      tuples,
      listClient,
      exceptionsList: [],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(true);
    expect(mockService.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(4);
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
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3))
      )
    );
    mockService.scopedClusterClient.asCurrentUser.bulk.mockRejectedValue(
      elasticsearchClientMock.createErrorTransportRequestPromise(new Error('bulk failed'))
    ); // Added this recently
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      listClient,
      exceptionsList: [exceptionItem],
      tuples,
      ruleSO,
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
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
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(sampleEmptyDocSearchResults())
    );
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
      tuples,
      ruleSO,
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(true);
    expect(createdSignalsCount).toEqual(0);
    expect(lastLookBackDate).toEqual(null);
  });

  test('if returns false when singleSearchAfter throws an exception', async () => {
    mockService.scopedClusterClient.asCurrentUser.search
      .mockResolvedValueOnce(
        // @ts-expect-error not full response interface
        elasticsearchClientMock.createSuccessTransportRequestPromise({
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
      )
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
      tuples,
      ruleSO,
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(false);
    expect(createdSignalsCount).toEqual(0); // should not create signals if search threw error
    expect(lastLookBackDate).toEqual(null);
  });

  test('it returns error array when singleSearchAfter returns errors', async () => {
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
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(bulkItem)
    ); // adds the response with errors we are testing

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(9, 12))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        sampleDocSearchResultsNoSortIdNoHits()
      )
    );
    const {
      success,
      createdSignalsCount,
      lastLookBackDate,
      errors,
    } = await searchAfterAndBulkCreate({
      ruleSO,
      tuples,
      listClient,
      exceptionsList: [],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(false);
    expect(errors).toEqual(['error on creation']);
    expect(mockService.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(5);
    expect(createdSignalsCount).toEqual(4);
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  it('invokes the enrichment callback with signal search results', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
      )
    );

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResolvedValueOnce(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
    );

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        sampleDocSearchResultsNoSortIdNoHits()
      )
    );

    const mockEnrichment = jest.fn((a) => a);
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      enrichment: mockEnrichment,
      ruleSO,
      tuples,
      listClient,
      exceptionsList: [],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      pageSize: 1,
      filter: undefined,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });

    expect(mockEnrichment).toHaveBeenCalledWith(
      expect.objectContaining({
        hits: expect.objectContaining({
          hits: expect.arrayContaining([
            expect.objectContaining({
              ...sampleDocWithSortId(),
              _id: expect.any(String),
            }),
          ]),
        }),
      })
    );
    expect(success).toEqual(true);
    expect(mockService.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(4);
    expect(createdSignalsCount).toEqual(3);
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });
});
