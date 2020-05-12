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
import { alertsMock, AlertServicesMock } from '../../../../../alerting/server/mocks';
import uuid from 'uuid';
import { ListClient } from '../../../../../lists/server';
import { ListItemArraySchema } from '../../../../../lists/common/schemas';

describe('searchAfterAndBulkCreate', () => {
  let mockService: AlertServicesMock;
  let inputIndexPattern: string[] = [];
  const someGuids = Array.from({ length: 13 }).map(x => uuid.v4());
  beforeEach(() => {
    jest.clearAllMocks();
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
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      ruleParams: sampleParams,
      listClient: ({
        getListItemByValues: async ({ value }: { type: string; listId: string; value: string[] }) =>
          (value as unknown) as ListItemArraySchema,
      } as unknown) as ListClient,
      exceptionsList: [
        {
          field: 'source.ip',
          values_operator: 'excluded',
          values_type: 'list',
          values: [
            {
              id: 'ci-badguys.txt',
              name: 'ip',
            },
          ],
        },
      ],
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

  test('should return success when all search results are in the allowlist', async () => {
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
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      ruleParams: sampleParams,
      listClient: ({
        getListItemByValues: async ({ value }: { type: string; listId: string; value: string[] }) =>
          (value as unknown) as ListItemArraySchema,
      } as unknown) as ListClient,
      exceptionsList: [
        {
          field: 'source.ip',
          values_operator: 'excluded',
          values_type: 'list',
          values: [
            {
              id: 'ci-badguys.txt',
              name: 'ip',
            },
          ],
        },
      ],
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
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      ruleParams: sampleParams,
      listClient: ({
        getListItemByValues: async ({ value }: { type: string; listId: string; value: string[] }) =>
          (value as unknown) as ListItemArraySchema,
      } as unknown) as ListClient,
      exceptionsList: undefined,
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
    const sampleParams = sampleRuleAlertParams(10);
    mockService.callCluster
      .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3)))
      .mockRejectedValue(new Error('bulk failed')); // Added this recently
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      listClient: ({
        getListItemByValues: ({ value }: { value: string[] }) => value,
      } as unknown) as ListClient,
      exceptionsList: [
        {
          field: 'source.ip',
          values_operator: 'excluded',
          values_type: 'list',
          values: [
            {
              id: 'ci-badguys.txt',
              name: 'ip',
            },
          ],
        },
      ],
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
    const sampleParams = sampleRuleAlertParams();
    mockService.callCluster.mockResolvedValueOnce(sampleEmptyDocSearchResults());
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      listClient: ({
        getListItemByValues: ({ value }: { value: string[] }) => value,
      } as unknown) as ListClient,
      exceptionsList: [
        {
          field: 'source.ip',
          values_operator: 'excluded',
          values_type: 'list',
          values: [
            {
              id: 'ci-badguys.txt',
              name: 'ip',
            },
          ],
        },
      ],
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

  // test('if successful iteration of while loop with maxDocs and search after returns results with no sort ids', async () => {
  //   const sampleParams = sampleRuleAlertParams(10);
  //   mockService.callCluster
  //     .mockResolvedValueOnce({
  //       took: 100,
  //       errors: false,
  //       items: [
  //         {
  //           fakeItemValue: 'fakeItemKey',
  //         },
  //         {
  //           create: {
  //             status: 201,
  //           },
  //         },
  //       ],
  //     })
  //     .mockResolvedValueOnce(sampleDocSearchResultsNoSortId());
  //   const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
  //     listClient: ({ getListItemByValues: () => [] } as unknown) as ListClient,
  //     listValueType: 'ip',
  //     ruleParams: sampleParams,
  //     services: mockService,
  //     logger: mockLogger,
  //     id: sampleRuleGuid,
  //     inputIndexPattern,
  //     signalsIndex: DEFAULT_SIGNALS_INDEX,
  //     name: 'rule-name',
  //     actions: [],
  //     createdAt: '2020-01-28T15:58:34.810Z',
  //     updatedAt: '2020-01-28T15:59:14.004Z',
  //     createdBy: 'elastic',
  //     updatedBy: 'elastic',
  //     interval: '5m',
  //     enabled: true,
  //     pageSize: 1,
  //     filter: undefined,
  //     refresh: false,
  //     tags: ['some fake tag 1', 'some fake tag 2'],
  //     throttle: 'no_actions',
  //   });
  //   expect(success).toEqual(true);
  //   expect(createdSignalsCount).toEqual(1);
  //   expect(lastLookBackDate).toEqual(new Date('2020-04-20T21:27:45+0000'));
  // });

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
    const { success, createdSignalsCount, lastLookBackDate } = await searchAfterAndBulkCreate({
      listClient: ({
        getListItemByValues: ({ value }: { value: string[] }) => value,
      } as unknown) as ListClient,
      exceptionsList: [
        {
          field: 'source.ip',
          values_operator: 'excluded',
          values_type: 'list',
          values: [
            {
              id: 'ci-badguys.txt',
              name: 'ip',
            },
          ],
        },
      ],
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
