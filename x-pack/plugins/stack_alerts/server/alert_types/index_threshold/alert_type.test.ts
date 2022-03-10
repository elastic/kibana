/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { Writable } from '@kbn/utility-types';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { AlertServices } from '../../../../alerting/server';
import { getAlertType, ActionGroupId } from './alert_type';
import { ActionContext } from './action_context';
import { Params } from './alert_type_params';
import { AlertServicesMock, alertsMock } from '../../../../alerting/server/mocks';
import { Comparator } from '../../../common/comparator_types';

describe('alertType', () => {
  const logger = loggingSystemMock.create().get();
  const data = {
    timeSeriesQuery: jest.fn(),
  };
  const alertServices: AlertServicesMock = alertsMock.createAlertServices();

  const alertType = getAlertType(logger, Promise.resolve(data));

  afterEach(() => {
    data.timeSeriesQuery.mockReset();
  });

  it('alert type creation structure is the expected value', async () => {
    expect(alertType.id).toBe('.index-threshold');
    expect(alertType.name).toBe('Index threshold');
    expect(alertType.actionGroups).toEqual([{ id: 'threshold met', name: 'Threshold met' }]);

    expect(alertType.actionVariables).toMatchInlineSnapshot(`
      Object {
        "context": Array [
          Object {
            "description": "A pre-constructed message for the alert.",
            "name": "message",
          },
          Object {
            "description": "A pre-constructed title for the alert.",
            "name": "title",
          },
          Object {
            "description": "The group that exceeded the threshold.",
            "name": "group",
          },
          Object {
            "description": "The date the alert exceeded the threshold.",
            "name": "date",
          },
          Object {
            "description": "The value that exceeded the threshold.",
            "name": "value",
          },
          Object {
            "description": "A string describing the threshold comparator and threshold",
            "name": "conditions",
          },
        ],
        "params": Array [
          Object {
            "description": "An array of values to use as the threshold; 'between' and 'notBetween' require two values, the others require one.",
            "name": "threshold",
          },
          Object {
            "description": "A comparison function to use to determine if the threshold as been met.",
            "name": "thresholdComparator",
          },
          Object {
            "description": "index",
            "name": "index",
          },
          Object {
            "description": "timeField",
            "name": "timeField",
          },
          Object {
            "description": "aggType",
            "name": "aggType",
          },
          Object {
            "description": "aggField",
            "name": "aggField",
          },
          Object {
            "description": "groupBy",
            "name": "groupBy",
          },
          Object {
            "description": "termField",
            "name": "termField",
          },
          Object {
            "description": "termSize",
            "name": "termSize",
          },
          Object {
            "description": "timeWindowSize",
            "name": "timeWindowSize",
          },
          Object {
            "description": "timeWindowUnit",
            "name": "timeWindowUnit",
          },
        ],
      }
    `);
  });

  it('validator succeeds with valid params', async () => {
    const params: Partial<Writable<Params>> = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'count',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: Comparator.LT,
      threshold: [0],
    };

    expect(alertType.validate?.params?.validate(params)).toBeTruthy();
  });

  it('validator fails with invalid params', async () => {
    const paramsSchema = alertType.validate?.params;
    if (!paramsSchema) throw new Error('params validator not set');

    const params: Partial<Writable<Params>> = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'foo',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: Comparator.GT,
      threshold: [0],
    };

    expect(() => paramsSchema.validate(params)).toThrowErrorMatchingInlineSnapshot(
      `"[aggType]: invalid aggType: \\"foo\\""`
    );
  });

  it('should ensure 0 results fires actions if it passes the comparator check', async () => {
    data.timeSeriesQuery.mockImplementation((...args) => {
      return {
        results: [
          {
            group: 'all documents',
            metrics: [['2021-07-14T14:49:30.978Z', 0]],
          },
        ],
      };
    });
    const params: Params = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'foo',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: Comparator.LT,
      threshold: [1],
    };

    await alertType.executor({
      alertId: uuid.v4(),
      executionId: uuid.v4(),
      startedAt: new Date(),
      previousStartedAt: new Date(),
      services: alertServices as unknown as AlertServices<{}, ActionContext, typeof ActionGroupId>,
      params,
      state: {
        latestTimestamp: undefined,
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

    expect(alertServices.alertFactory.create).toHaveBeenCalledWith('all documents');
  });

  it('should ensure a null result does not fire actions', async () => {
    const customAlertServices: AlertServicesMock = alertsMock.createAlertServices();
    data.timeSeriesQuery.mockImplementation((...args) => {
      return {
        results: [
          {
            group: 'all documents',
            metrics: [['2021-07-14T14:49:30.978Z', null]],
          },
        ],
      };
    });
    const params: Params = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'foo',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: Comparator.LT,
      threshold: [1],
    };

    await alertType.executor({
      alertId: uuid.v4(),
      executionId: uuid.v4(),
      startedAt: new Date(),
      previousStartedAt: new Date(),
      services: customAlertServices as unknown as AlertServices<
        {},
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

    expect(customAlertServices.alertFactory.create).not.toHaveBeenCalled();
  });

  it('should ensure an undefined result does not fire actions', async () => {
    const customAlertServices: AlertServicesMock = alertsMock.createAlertServices();
    data.timeSeriesQuery.mockImplementation((...args) => {
      return {
        results: [
          {
            group: 'all documents',
            metrics: [['2021-07-14T14:49:30.978Z', undefined]],
          },
        ],
      };
    });
    const params: Params = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'foo',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: Comparator.LT,
      threshold: [1],
    };

    await alertType.executor({
      alertId: uuid.v4(),
      executionId: uuid.v4(),
      startedAt: new Date(),
      previousStartedAt: new Date(),
      services: customAlertServices as unknown as AlertServices<
        {},
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

    expect(customAlertServices.alertFactory.create).not.toHaveBeenCalled();
  });
});
