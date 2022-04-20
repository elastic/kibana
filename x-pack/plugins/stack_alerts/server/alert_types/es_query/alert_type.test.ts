/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { Writable } from '@kbn/utility-types';
import { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import {
  RuleExecutorServicesMock,
  alertsMock,
  AlertInstanceMock,
} from '@kbn/alerting-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getAlertType } from './alert_type';
import { EsQueryAlertParams, EsQueryAlertState } from './alert_type_params';
import { ActionContext } from './action_context';
import { ESSearchResponse, ESSearchRequest } from '@kbn/core/types/elasticsearch';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { ActionGroupId, ConditionMetAlertInstanceId } from './constants';
import { OnlyEsQueryAlertParams, OnlySearchSourceAlertParams } from './types';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { Comparator } from '../../../common/comparator_types';

const logger = loggingSystemMock.create().get();
const coreSetup = coreMock.createSetup();
const alertType = getAlertType(logger, coreSetup);

describe('alertType', () => {
  it('alert type creation structure is the expected value', async () => {
    expect(alertType.id).toBe('.es-query');
    expect(alertType.name).toBe('Elasticsearch query');
    expect(alertType.actionGroups).toEqual([{ id: 'query matched', name: 'Query matched' }]);

    expect(alertType.actionVariables).toMatchInlineSnapshot(`
      Object {
        "context": Array [
          Object {
            "description": "A message for the alert.",
            "name": "message",
          },
          Object {
            "description": "A title for the alert.",
            "name": "title",
          },
          Object {
            "description": "The date that the alert met the threshold condition.",
            "name": "date",
          },
          Object {
            "description": "The value that met the threshold condition.",
            "name": "value",
          },
          Object {
            "description": "The documents that met the threshold condition.",
            "name": "hits",
          },
          Object {
            "description": "A string that describes the threshold condition.",
            "name": "conditions",
          },
          Object {
            "description": "Navigate to Discover and show the records that triggered
             the alert when the rule is created in Discover. Otherwise, navigate to the status page for the rule.",
            "name": "link",
          },
        ],
        "params": Array [
          Object {
            "description": "The number of hits to retrieve for each query.",
            "name": "size",
          },
          Object {
            "description": "An array of values to use as the threshold. 'between' and 'notBetween' require two values.",
            "name": "threshold",
          },
          Object {
            "description": "A function to determine if the threshold was met.",
            "name": "thresholdComparator",
          },
          Object {
            "description": "Serialized search source fields used to fetch the documents from Elasticsearch.",
            "name": "searchConfiguration",
          },
          Object {
            "description": "The string representation of the Elasticsearch query.",
            "name": "esQuery",
          },
          Object {
            "description": "The index the query was run against.",
            "name": "index",
          },
        ],
      }
    `);
  });

  describe('elasticsearch query', () => {
    it('validator succeeds with valid es query params', async () => {
      const params: Partial<Writable<OnlyEsQueryAlertParams>> = {
        index: ['index-name'],
        timeField: 'time-field',
        esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
        size: 100,
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        thresholdComparator: Comparator.LT,
        threshold: [0],
      };

      expect(alertType.validate?.params?.validate(params)).toBeTruthy();
    });

    it('validator fails with invalid es query params - threshold', async () => {
      const paramsSchema = alertType.validate?.params;
      if (!paramsSchema) throw new Error('params validator not set');

      const params: Partial<Writable<OnlyEsQueryAlertParams>> = {
        index: ['index-name'],
        timeField: 'time-field',
        esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
        size: 100,
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        thresholdComparator: Comparator.BETWEEN,
        threshold: [0],
      };

      expect(() => paramsSchema.validate(params)).toThrowErrorMatchingInlineSnapshot(
        `"[threshold]: must have two elements for the \\"between\\" comparator"`
      );
    });

    it('alert executor handles no documents returned by ES', async () => {
      const params: OnlyEsQueryAlertParams = {
        index: ['index-name'],
        timeField: 'time-field',
        esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
        size: 100,
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        thresholdComparator: Comparator.BETWEEN,
        threshold: [0],
      };
      const alertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();

      const searchResult: ESSearchResponse<unknown, {}> = generateResults([]);
      alertServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(searchResult)
      );

      const result = await invokeExecutor({ params, alertServices });

      expect(alertServices.alertFactory.create).not.toHaveBeenCalled();

      expect(result).toMatchInlineSnapshot(`
        Object {
          "latestTimestamp": undefined,
        }
      `);
    });

    it('alert executor returns the latestTimestamp of the newest detected document', async () => {
      const params: OnlyEsQueryAlertParams = {
        index: ['index-name'],
        timeField: 'time-field',
        esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
        size: 100,
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        thresholdComparator: Comparator.GT,
        threshold: [0],
      };
      const alertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();

      const newestDocumentTimestamp = Date.now();

      const searchResult: ESSearchResponse<unknown, {}> = generateResults([
        {
          'time-field': newestDocumentTimestamp,
        },
        {
          'time-field': newestDocumentTimestamp - 1000,
        },
        {
          'time-field': newestDocumentTimestamp - 2000,
        },
      ]);
      alertServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(searchResult)
      );

      const result = await invokeExecutor({ params, alertServices });

      expect(alertServices.alertFactory.create).toHaveBeenCalledWith(ConditionMetAlertInstanceId);
      const instance: AlertInstanceMock = alertServices.alertFactory.create.mock.results[0].value;
      expect(instance.replaceState).toHaveBeenCalledWith({
        latestTimestamp: undefined,
        dateStart: expect.any(String),
        dateEnd: expect.any(String),
      });

      expect(result).toMatchObject({
        latestTimestamp: new Date(newestDocumentTimestamp).toISOString(),
      });
    });

    it('alert executor correctly handles numeric time fields that were stored by legacy rules prior to v7.12.1', async () => {
      const params: OnlyEsQueryAlertParams = {
        index: ['index-name'],
        timeField: 'time-field',
        esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
        size: 100,
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        thresholdComparator: Comparator.GT,
        threshold: [0],
      };
      const alertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();

      const previousTimestamp = Date.now();
      const newestDocumentTimestamp = previousTimestamp + 1000;

      alertServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          generateResults([
            {
              'time-field': newestDocumentTimestamp,
            },
          ])
        )
      );

      const result = await invokeExecutor({
        params,
        alertServices,
        state: {
          // @ts-expect-error previousTimestamp is numeric, but should be string (this was a bug prior to v7.12.1)
          latestTimestamp: previousTimestamp,
        },
      });

      const instance: AlertInstanceMock = alertServices.alertFactory.create.mock.results[0].value;
      expect(instance.replaceState).toHaveBeenCalledWith({
        // ensure the invalid "latestTimestamp" in the state is stored as an ISO string going forward
        latestTimestamp: new Date(previousTimestamp).toISOString(),
        dateStart: expect.any(String),
        dateEnd: expect.any(String),
      });

      expect(result).toMatchObject({
        latestTimestamp: new Date(newestDocumentTimestamp).toISOString(),
      });
    });

    it('alert executor ignores previous invalid latestTimestamp values stored by legacy rules prior to v7.12.1', async () => {
      const params: OnlyEsQueryAlertParams = {
        index: ['index-name'],
        timeField: 'time-field',
        esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
        size: 100,
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        thresholdComparator: Comparator.GT,
        threshold: [0],
      };
      const alertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();

      const oldestDocumentTimestamp = Date.now();

      alertServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          generateResults([
            {
              'time-field': oldestDocumentTimestamp,
            },
            {
              'time-field': oldestDocumentTimestamp - 1000,
            },
          ])
        )
      );

      const result = await invokeExecutor({ params, alertServices });

      const instance: AlertInstanceMock = alertServices.alertFactory.create.mock.results[0].value;
      expect(instance.replaceState).toHaveBeenCalledWith({
        latestTimestamp: undefined,
        dateStart: expect.any(String),
        dateEnd: expect.any(String),
      });

      expect(result).toMatchObject({
        latestTimestamp: new Date(oldestDocumentTimestamp).toISOString(),
      });
    });

    it('alert executor carries over the queried latestTimestamp in the alert state', async () => {
      const params: OnlyEsQueryAlertParams = {
        index: ['index-name'],
        timeField: 'time-field',
        esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
        size: 100,
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        thresholdComparator: Comparator.GT,
        threshold: [0],
      };
      const alertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();

      const oldestDocumentTimestamp = Date.now();

      alertServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          generateResults([
            {
              'time-field': oldestDocumentTimestamp,
            },
          ])
        )
      );

      const result = await invokeExecutor({ params, alertServices });

      const instance: AlertInstanceMock = alertServices.alertFactory.create.mock.results[0].value;
      expect(instance.replaceState).toHaveBeenCalledWith({
        latestTimestamp: undefined,
        dateStart: expect.any(String),
        dateEnd: expect.any(String),
      });

      expect(result).toMatchObject({
        latestTimestamp: new Date(oldestDocumentTimestamp).toISOString(),
      });

      const newestDocumentTimestamp = oldestDocumentTimestamp + 5000;
      alertServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          generateResults([
            {
              'time-field': newestDocumentTimestamp,
            },
            {
              'time-field': newestDocumentTimestamp - 1000,
            },
          ])
        )
      );

      const secondResult = await invokeExecutor({
        params,
        alertServices,
        state: result as EsQueryAlertState,
      });

      const existingInstance: AlertInstanceMock =
        alertServices.alertFactory.create.mock.results[1].value;
      expect(existingInstance.replaceState).toHaveBeenCalledWith({
        latestTimestamp: new Date(oldestDocumentTimestamp).toISOString(),
        dateStart: expect.any(String),
        dateEnd: expect.any(String),
      });

      expect(secondResult).toMatchObject({
        latestTimestamp: new Date(newestDocumentTimestamp).toISOString(),
      });
    });

    it('alert executor ignores tie breaker sort values', async () => {
      const params: OnlyEsQueryAlertParams = {
        index: ['index-name'],
        timeField: 'time-field',
        esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
        size: 100,
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        thresholdComparator: Comparator.GT,
        threshold: [0],
      };
      const alertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();

      const oldestDocumentTimestamp = Date.now();

      alertServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          generateResults(
            [
              {
                'time-field': oldestDocumentTimestamp,
              },
              {
                'time-field': oldestDocumentTimestamp - 1000,
              },
            ],
            true
          )
        )
      );

      const result = await invokeExecutor({ params, alertServices });

      const instance: AlertInstanceMock = alertServices.alertFactory.create.mock.results[0].value;
      expect(instance.replaceState).toHaveBeenCalledWith({
        latestTimestamp: undefined,
        dateStart: expect.any(String),
        dateEnd: expect.any(String),
      });

      expect(result).toMatchObject({
        latestTimestamp: new Date(oldestDocumentTimestamp).toISOString(),
      });
    });

    it('alert executor ignores results with no sort values', async () => {
      const params: OnlyEsQueryAlertParams = {
        index: ['index-name'],
        timeField: 'time-field',
        esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
        size: 100,
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        thresholdComparator: Comparator.GT,
        threshold: [0],
      };
      const alertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();

      const oldestDocumentTimestamp = Date.now();

      alertServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          generateResults(
            [
              {
                'time-field': oldestDocumentTimestamp,
              },
              {
                'time-field': oldestDocumentTimestamp - 1000,
              },
            ],
            true,
            true
          )
        )
      );

      const result = await invokeExecutor({ params, alertServices });

      const instance: AlertInstanceMock = alertServices.alertFactory.create.mock.results[0].value;
      expect(instance.replaceState).toHaveBeenCalledWith({
        latestTimestamp: undefined,
        dateStart: expect.any(String),
        dateEnd: expect.any(String),
      });

      expect(result).toMatchObject({
        latestTimestamp: new Date(oldestDocumentTimestamp - 1000).toISOString(),
      });
    });
  });

  describe('search source query', () => {
    const dataViewMock = {
      id: 'test-id',
      title: 'test-title',
      timeFieldName: 'time-field',
      fields: [
        {
          name: 'message',
          type: 'string',
          displayName: 'message',
          scripted: false,
          filterable: false,
          aggregatable: false,
        },
        {
          name: 'timestamp',
          type: 'date',
          displayName: 'timestamp',
          scripted: false,
          filterable: false,
          aggregatable: false,
        },
      ],
    };
    const defaultParams: OnlySearchSourceAlertParams = {
      size: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: Comparator.LT,
      threshold: [0],
      searchConfiguration: {},
      searchType: 'searchSource',
    };

    afterAll(() => {
      jest.resetAllMocks();
    });

    it('validator succeeds with valid search source params', async () => {
      expect(alertType.validate?.params?.validate(defaultParams)).toBeTruthy();
    });

    it('validator fails with invalid search source params - esQuery provided', async () => {
      const paramsSchema = alertType.validate?.params!;
      const params: Partial<Writable<EsQueryAlertParams>> = {
        size: 100,
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        thresholdComparator: Comparator.LT,
        threshold: [0],
        esQuery: '',
        searchType: 'searchSource',
      };

      expect(() => paramsSchema.validate(params)).toThrowErrorMatchingInlineSnapshot(
        `"[esQuery]: a value wasn't expected to be present"`
      );
    });

    it('alert executor handles no documents returned by ES', async () => {
      const params = defaultParams;
      const searchResult: ESSearchResponse<unknown, {}> = generateResults([]);
      const alertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();

      (searchSourceInstanceMock.getField as jest.Mock).mockImplementationOnce((name: string) => {
        if (name === 'index') {
          return dataViewMock;
        }
      });
      (searchSourceInstanceMock.fetch as jest.Mock).mockResolvedValueOnce(searchResult);

      await invokeExecutor({ params, alertServices });

      expect(alertServices.alertFactory.create).not.toHaveBeenCalled();
    });

    it('alert executor throws an error when index does not have time field', async () => {
      const params = defaultParams;
      const alertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();

      (searchSourceInstanceMock.getField as jest.Mock).mockImplementationOnce((name: string) => {
        if (name === 'index') {
          return { dataViewMock, timeFieldName: undefined };
        }
      });

      await expect(invokeExecutor({ params, alertServices })).rejects.toThrow(
        'Invalid data view without timeFieldName.'
      );
    });

    it('alert executor schedule actions when condition met', async () => {
      const params = { ...defaultParams, thresholdComparator: Comparator.GT_OR_EQ, threshold: [3] };
      const alertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();

      (searchSourceInstanceMock.getField as jest.Mock).mockImplementationOnce((name: string) => {
        if (name === 'index') {
          return dataViewMock;
        }
      });

      (searchSourceInstanceMock.fetch as jest.Mock).mockResolvedValueOnce({
        hits: { total: 3, hits: [{}, {}, {}] },
      });

      await invokeExecutor({ params, alertServices });

      const instance: AlertInstanceMock = alertServices.alertFactory.create.mock.results[0].value;
      expect(instance.scheduleActions).toHaveBeenCalled();
    });
  });
});

function generateResults(
  docs: Array<{ 'time-field': unknown; [key: string]: unknown }>,
  includeTieBreaker: boolean = false,
  skipSortOnFirst: boolean = false
): ESSearchResponse<unknown, ESSearchRequest> {
  const hits = docs.map((doc, index) => ({
    _index: 'foo',
    _type: '_doc',
    _id: `${index}`,
    _score: 0,
    ...(skipSortOnFirst && index === 0
      ? {}
      : {
          sort: (includeTieBreaker
            ? ['FaslK3QBySSL_rrj9zM5', doc['time-field']]
            : [doc['time-field']]) as string[],
        }),
    _source: doc,
  }));
  return {
    took: 10,
    timed_out: false,
    _shards: {
      total: 10,
      successful: 10,
      failed: 0,
      skipped: 0,
    },
    hits: {
      total: {
        value: docs.length,
        relation: 'eq',
      },
      max_score: 100,
      hits,
    },
  };
}

async function invokeExecutor({
  params,
  alertServices,
  state,
}: {
  params: OnlySearchSourceAlertParams | OnlyEsQueryAlertParams;
  alertServices: RuleExecutorServicesMock;
  state?: EsQueryAlertState;
}) {
  return await alertType.executor({
    alertId: uuid.v4(),
    executionId: uuid.v4(),
    startedAt: new Date(),
    previousStartedAt: new Date(),
    services: alertServices as unknown as RuleExecutorServices<
      EsQueryAlertState,
      ActionContext,
      typeof ActionGroupId
    >,
    params: params as EsQueryAlertParams,
    state: {
      latestTimestamp: undefined,
      ...state,
    },
    spaceId: uuid.v4(),
    name: uuid.v4(),
    tags: [],
    createdBy: null,
    updatedBy: null,
    rule: {
      name: uuid.v4(),
      tags: [],
      consumer: '',
      producer: '',
      ruleTypeId: '',
      ruleTypeName: '',
      enabled: true,
      schedule: {
        interval: '1h',
      },
      actions: [],
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      throttle: null,
      notifyWhen: null,
    },
  });
}
