/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sampleEmptyDocSearchResults,
  sampleRuleGuid,
  mockLogger,
  repeatedSearchResultsWithSortId,
  repeatedSearchResultsWithNoSortId,
  sampleDocSearchResultsNoSortIdNoHits,
  sampleDocWithSortId,
} from './__mocks__/es_results';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { alertsMock, RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import uuid from 'uuid';
import { listMock } from '@kbn/lists-plugin/server/mocks';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { BulkCreate, BulkResponse, RuleRangeTuple, WrapHits } from './types';
import type { SearchListItemArraySchema } from '@kbn/securitysolution-io-ts-list-types';
import { getSearchListItemResponseMock } from '@kbn/lists-plugin/common/schemas/response/search_list_item_schema.mock';
import { getRuleRangeTuples } from './utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';
import { getCompleteRuleMock, getQueryRuleParams } from '../schemas/rule_schemas.mock';
import { bulkCreateFactory } from '../rule_types/factories/bulk_create_factory';
import { wrapHitsFactory } from '../rule_types/factories/wrap_hits_factory';
import { mockBuildRuleMessage } from './__mocks__/build_rule_message.mock';
import { BuildReasonMessage } from './reason_formatters';
import { QueryRuleParams } from '../schemas/rule_schemas';
import { createPersistenceServicesMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { PersistenceServices } from '@kbn/rule-registry-plugin/server';
import {
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { SERVER_APP_ID } from '../../../../common/constants';
import { CommonAlertFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';

const buildRuleMessage = mockBuildRuleMessage;

describe('searchAfterAndBulkCreate', () => {
  let mockService: RuleExecutorServicesMock;
  let mockPersistenceServices: jest.Mocked<PersistenceServices>;
  let buildReasonMessage: BuildReasonMessage;
  let bulkCreate: BulkCreate;
  let wrapHits: WrapHits;
  let inputIndexPattern: string[] = [];
  let listClient = listMock.getListClient();
  const someGuids = Array.from({ length: 13 }).map(() => uuid.v4());
  const sampleParams = getQueryRuleParams();
  const queryCompleteRule = getCompleteRuleMock<QueryRuleParams>(sampleParams);
  const defaultFilter = {
    match_all: {},
  };
  const mockCommonFields: CommonAlertFieldsLatest = {
    [ALERT_RULE_CATEGORY]: 'Custom Query Rule',
    [ALERT_RULE_CONSUMER]: SERVER_APP_ID,
    [ALERT_RULE_EXECUTION_UUID]: '97e8f53a-4971-4935-bb54-9b8f86930cc7',
    [ALERT_RULE_NAME]: 'rule-name',
    [ALERT_RULE_PRODUCER]: 'siem',
    [ALERT_RULE_TYPE_ID]: 'siem.queryRule',
    [ALERT_RULE_UUID]: '2e051244-b3c6-4779-a241-e1b4f0beceb9',
    [SPACE_IDS]: ['default'],
    [ALERT_RULE_TAGS]: [],
    [TIMESTAMP]: '2020-04-20T21:27:45+0000',
  };
  sampleParams.maxSignals = 30;
  let tuple: RuleRangeTuple;
  beforeEach(() => {
    jest.clearAllMocks();
    buildReasonMessage = jest.fn().mockResolvedValue('some alert reason message');
    listClient = listMock.getListClient();
    listClient.searchListItemByValues = jest.fn().mockResolvedValue([]);
    inputIndexPattern = ['auditbeat-*'];
    mockService = alertsMock.createRuleExecutorServices();
    tuple = getRuleRangeTuples({
      logger: mockLogger,
      previousStartedAt: new Date(),
      startedAt: new Date(),
      from: sampleParams.from,
      to: sampleParams.to,
      interval: '5m',
      maxSignals: sampleParams.maxSignals,
      buildRuleMessage,
    }).tuples[0];
    mockPersistenceServices = createPersistenceServicesMock();
    bulkCreate = bulkCreateFactory(
      mockLogger,
      mockPersistenceServices.alertWithPersistence,
      buildRuleMessage,
      false
    );
    wrapHits = wrapHitsFactory({
      completeRule: queryCompleteRule,
      mergeStrategy: 'missingFields',
      ignoreFields: [],
      spaceId: 'default',
    });
  });

  test('should return success with number of searches less than max signals', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3))
      )
    );

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
      )
    );

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
      )
    );

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(9, 12))
      )
    );

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '4',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

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
      tuple,
      completeRule: queryCompleteRule,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      pageSize: 1,
      filter: defaultFilter,
      buildReasonMessage,
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
    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
      )
    );

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
      )
    );

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

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
      completeRule: queryCompleteRule,
      tuple,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      pageSize: 1,
      filter: defaultFilter,
      buildReasonMessage,
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

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '4',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

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
      completeRule: queryCompleteRule,
      tuple,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      pageSize: 1,
      filter: defaultFilter,
      buildReasonMessage,
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
      completeRule: queryCompleteRule,
      tuple,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      pageSize: 1,
      filter: defaultFilter,
      buildReasonMessage,
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
    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '4',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });
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
      completeRule: queryCompleteRule,
      tuple,
      listClient,
      exceptionsList: [],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      pageSize: 1,
      filter: defaultFilter,
      buildReasonMessage,
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
      completeRule: queryCompleteRule,
      tuple,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      pageSize: 1,
      filter: defaultFilter,
      buildReasonMessage,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(true);
    expect(mockService.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
    expect(createdSignalsCount).toEqual(0); // should not create any signals because all events were in the allowlist
    expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  });

  test('should return success when no sortId present but search results are in the allowlist', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithNoSortId(4, 4, someGuids.slice(0, 3))
      )
    );

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '4',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
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
      completeRule: queryCompleteRule,
      tuple,
      listClient,
      exceptionsList: [exceptionItem],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      pageSize: 1,
      filter: defaultFilter,
      buildReasonMessage,
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

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '4',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

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
      completeRule: queryCompleteRule,
      tuple,
      listClient,
      exceptionsList: [],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      pageSize: 1,
      filter: defaultFilter,
      buildReasonMessage,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(true);
    expect(mockService.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(4);
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
      tuple,
      completeRule: queryCompleteRule,
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      pageSize: 1,
      filter: defaultFilter,
      buildReasonMessage,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
    expect(success).toEqual(true);
    expect(createdSignalsCount).toEqual(0);
    expect(lastLookBackDate).toEqual(null);
  });

  test('if returns false when singleSearchAfter throws an exception', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockImplementation(() => {
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
      tuple,
      completeRule: queryCompleteRule,
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      pageSize: 1,
      filter: defaultFilter,
      buildReasonMessage,
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

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {
        'error on creation': {
          count: 1,
          statusCode: 500,
        },
      },
    });

    mockService.scopedClusterClient.asCurrentUser.bulk.mockResponseOnce(bulkItem); // adds the response with errors we are testing

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
      )
    );

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
      )
    );

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(9, 12))
      )
    );

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '4',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        sampleDocSearchResultsNoSortIdNoHits()
      )
    );
    const { success, createdSignalsCount, lastLookBackDate, errors } =
      await searchAfterAndBulkCreate({
        completeRule: queryCompleteRule,
        tuple,
        listClient,
        exceptionsList: [],
        services: mockService,
        logger: mockLogger,
        eventsTelemetry: undefined,
        id: sampleRuleGuid,
        inputIndexPattern,
        pageSize: 1,
        filter: defaultFilter,
        buildReasonMessage,
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

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
      )
    );

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
      )
    );

    mockPersistenceServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
    });

    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        sampleDocSearchResultsNoSortIdNoHits()
      )
    );

    const mockEnrichment = jest.fn((a) => a);
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      enrichment: mockEnrichment,
      completeRule: queryCompleteRule,
      tuple,
      listClient,
      exceptionsList: [],
      services: mockService,
      logger: mockLogger,
      eventsTelemetry: undefined,
      id: sampleRuleGuid,
      inputIndexPattern,
      pageSize: 1,
      filter: defaultFilter,
      buildReasonMessage,
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
