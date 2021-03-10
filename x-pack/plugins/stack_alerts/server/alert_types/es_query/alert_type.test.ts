/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { Writable } from '@kbn/utility-types';
import { AlertServices } from '../../../../alerting/server';
import {
  AlertServicesMock,
  alertsMock,
  AlertInstanceMock,
} from '../../../../alerting/server/mocks';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { getAlertType, ConditionMetAlertInstanceId, ActionGroupId } from './alert_type';
import { EsQueryAlertParams, EsQueryAlertState } from './alert_type_params';
import { ActionContext } from './action_context';
import { ESSearchResponse, ESSearchRequest } from '../../../../../typings/elasticsearch';

describe('alertType', () => {
  const logger = loggingSystemMock.create().get();

  const alertType = getAlertType(logger);

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
        ],
        "params": Array [
          Object {
            "description": "The index the query was run against.",
            "name": "index",
          },
          Object {
            "description": "The string representation of the Elasticsearch query.",
            "name": "esQuery",
          },
          Object {
            "description": "The number of hits to retrieve for each query.",
            "name": "size",
          },
          Object {
            "description": "An array of values to use as the threshold; 'between' and 'notBetween' require two values, the others require one.",
            "name": "threshold",
          },
          Object {
            "description": "A function to determine if the threshold has been met.",
            "name": "thresholdComparator",
          },
        ],
      }
    `);
  });

  it('validator succeeds with valid params', async () => {
    const params: Partial<Writable<EsQueryAlertParams>> = {
      index: ['index-name'],
      timeField: 'time-field',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '<',
      threshold: [0],
    };

    expect(alertType.validate?.params?.validate(params)).toBeTruthy();
  });

  it('validator fails with invalid params - threshold', async () => {
    const paramsSchema = alertType.validate?.params;
    if (!paramsSchema) throw new Error('params validator not set');

    const params: Partial<Writable<EsQueryAlertParams>> = {
      index: ['index-name'],
      timeField: 'time-field',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: 'between',
      threshold: [0],
    };

    expect(() => paramsSchema.validate(params)).toThrowErrorMatchingInlineSnapshot(
      `"[threshold]: must have two elements for the \\"between\\" comparator"`
    );
  });

  it('alert executor handles no documentes returned by ES', async () => {
    const params: EsQueryAlertParams = {
      index: ['index-name'],
      timeField: 'time-field',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: 'between',
      threshold: [0],
    };
    const alertServices: AlertServicesMock = alertsMock.createAlertServices();

    const searchResult: ESSearchResponse<unknown, {}> = generateResults([]);
    alertServices.callCluster.mockResolvedValueOnce(searchResult);

    const result = await alertType.executor({
      alertId: uuid.v4(),
      startedAt: new Date(),
      previousStartedAt: new Date(),
      services: (alertServices as unknown) as AlertServices<
        EsQueryAlertState,
        ActionContext,
        typeof ActionGroupId
      >,
      params,
      state: {
        latestTimestamp: undefined,
      },
      spaceId: uuid.v4(),
      name: uuid.v4(),
      tags: [],
      createdBy: null,
      updatedBy: null,
    });

    expect(alertServices.alertInstanceFactory).not.toHaveBeenCalled();

    expect(result).toMatchInlineSnapshot(`
      Object {
        "latestTimestamp": undefined,
      }
    `);
  });

  it('alert executor returns the latestTimestamp of the newest detected document', async () => {
    const params: EsQueryAlertParams = {
      index: ['index-name'],
      timeField: 'time-field',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '>',
      threshold: [0],
    };
    const alertServices: AlertServicesMock = alertsMock.createAlertServices();

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
    alertServices.callCluster.mockResolvedValueOnce(searchResult);

    const result = await alertType.executor({
      alertId: uuid.v4(),
      startedAt: new Date(),
      previousStartedAt: new Date(),
      services: (alertServices as unknown) as AlertServices<
        EsQueryAlertState,
        ActionContext,
        typeof ActionGroupId
      >,
      params,
      state: {
        latestTimestamp: undefined,
      },
      spaceId: uuid.v4(),
      name: uuid.v4(),
      tags: [],
      createdBy: null,
      updatedBy: null,
    });

    expect(alertServices.alertInstanceFactory).toHaveBeenCalledWith(ConditionMetAlertInstanceId);
    const instance: AlertInstanceMock = alertServices.alertInstanceFactory.mock.results[0].value;
    expect(instance.replaceState).toHaveBeenCalledWith({
      latestTimestamp: undefined,
      dateStart: expect.any(String),
      dateEnd: expect.any(String),
    });

    expect(result).toMatchObject({
      latestTimestamp: new Date(newestDocumentTimestamp).toISOString(),
    });
  });

  it('alert executor carries over the queried latestTimestamp in the alert state', async () => {
    const params: EsQueryAlertParams = {
      index: ['index-name'],
      timeField: 'time-field',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '>',
      threshold: [0],
    };
    const alertServices: AlertServicesMock = alertsMock.createAlertServices();

    const oldestDocumentTimestamp = Date.now();

    alertServices.callCluster.mockResolvedValueOnce(
      generateResults([
        {
          'time-field': oldestDocumentTimestamp,
        },
      ])
    );

    const executorOptions = {
      alertId: uuid.v4(),
      startedAt: new Date(),
      previousStartedAt: new Date(),
      services: (alertServices as unknown) as AlertServices<
        EsQueryAlertState,
        ActionContext,
        typeof ActionGroupId
      >,
      params,
      state: {
        latestTimestamp: undefined,
      },
      spaceId: uuid.v4(),
      name: uuid.v4(),
      tags: [],
      createdBy: null,
      updatedBy: null,
    };
    const result = await alertType.executor(executorOptions);

    const instance: AlertInstanceMock = alertServices.alertInstanceFactory.mock.results[0].value;
    expect(instance.replaceState).toHaveBeenCalledWith({
      latestTimestamp: undefined,
      dateStart: expect.any(String),
      dateEnd: expect.any(String),
    });

    expect(result).toMatchObject({
      latestTimestamp: new Date(oldestDocumentTimestamp).toISOString(),
    });

    const newestDocumentTimestamp = oldestDocumentTimestamp + 5000;
    alertServices.callCluster.mockResolvedValueOnce(
      generateResults([
        {
          'time-field': newestDocumentTimestamp,
        },
        {
          'time-field': newestDocumentTimestamp - 1000,
        },
      ])
    );

    const secondResult = await alertType.executor({
      ...executorOptions,
      state: result as EsQueryAlertState,
    });
    const existingInstance: AlertInstanceMock =
      alertServices.alertInstanceFactory.mock.results[1].value;
    expect(existingInstance.replaceState).toHaveBeenCalledWith({
      latestTimestamp: new Date(oldestDocumentTimestamp).toISOString(),
      dateStart: expect.any(String),
      dateEnd: expect.any(String),
    });

    expect(secondResult).toMatchObject({
      latestTimestamp: new Date(newestDocumentTimestamp).toISOString(),
    });
  });

  it('alert executor ignored tie breaker sort values', async () => {
    const params: EsQueryAlertParams = {
      index: ['index-name'],
      timeField: 'time-field',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '>',
      threshold: [0],
    };
    const alertServices: AlertServicesMock = alertsMock.createAlertServices();

    const oldestDocumentTimestamp = Date.now();

    alertServices.callCluster.mockResolvedValueOnce(
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
    );

    const result = await alertType.executor({
      alertId: uuid.v4(),
      startedAt: new Date(),
      previousStartedAt: new Date(),
      services: (alertServices as unknown) as AlertServices<
        EsQueryAlertState,
        ActionContext,
        typeof ActionGroupId
      >,
      params,
      state: {
        latestTimestamp: undefined,
      },
      spaceId: uuid.v4(),
      name: uuid.v4(),
      tags: [],
      createdBy: null,
      updatedBy: null,
    });

    const instance: AlertInstanceMock = alertServices.alertInstanceFactory.mock.results[0].value;
    expect(instance.replaceState).toHaveBeenCalledWith({
      latestTimestamp: undefined,
      dateStart: expect.any(String),
      dateEnd: expect.any(String),
    });

    expect(result).toMatchObject({
      latestTimestamp: new Date(oldestDocumentTimestamp).toISOString(),
    });
  });
});

function generateResults(
  docs: Array<{ 'time-field': unknown; [key: string]: unknown }>,
  includeTieBreaker: boolean = false
): ESSearchResponse<unknown, ESSearchRequest> {
  const hits = docs.map((doc, index) => ({
    _index: 'foo',
    _type: '_doc',
    _id: `${index}`,
    _score: 0,
    sort: (includeTieBreaker
      ? ['FaslK3QBySSL_rrj9zM5', doc['time-field']]
      : [doc['time-field']]) as string[],
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
