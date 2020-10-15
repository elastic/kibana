/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readRules } from './read_rules';
import { alertsClientMock } from '../../../../../alerts/server/mocks';
import { getResult, getFindResultWithSingleHit } from '../routes/__mocks__/request_responses';

export class TestError extends Error {
  constructor() {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super();

    this.name = 'CustomError';
    this.output = { statusCode: 404 };
  }
  public output: { statusCode: number };
}

describe('read_rules', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
  describe('readRules', () => {
    test('should return the output from alertsClient if id is set but ruleId is undefined', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());

      const rule = await readRules({
        alertsClient,
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        ruleId: undefined,
      });
      expect(rule).toEqual(getResult());
    });
    test('should return null if saved object found by alerts client given id is not alert type', async () => {
      const alertsClient = alertsClientMock.create();
      const result = getResult();
      // @ts-expect-error
      delete result.alertTypeId;
      alertsClient.get.mockResolvedValue(result);

      const rule = await readRules({
        alertsClient,
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        ruleId: undefined,
      });
      expect(rule).toEqual(null);
    });

    test('should return error if alerts client throws 404 error on get', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockImplementation(() => {
        throw new TestError();
      });

      const rule = await readRules({
        alertsClient,
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        ruleId: undefined,
      });
      expect(rule).toEqual(null);
    });

    test('should return error if alerts client throws error on get', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockImplementation(() => {
        throw new Error('Test error');
      });
      try {
        await readRules({
          alertsClient,
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          ruleId: undefined,
        });
      } catch (exc) {
        expect(exc.message).toEqual('Test error');
      }
    });

    test('should return the output from alertsClient if id is undefined but ruleId is set', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const rule = await readRules({
        alertsClient,
        id: undefined,
        ruleId: 'rule-1',
      });
      expect(rule).toEqual(getResult());
    });

    test('should return null if the output from alertsClient with ruleId set is empty', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue({ data: [], page: 0, perPage: 1, total: 0 });

      const rule = await readRules({
        alertsClient,
        id: undefined,
        ruleId: 'rule-1',
      });
      expect(rule).toEqual(null);
    });

    test('should return the output from alertsClient if id is null but ruleId is set', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const rule = await readRules({
        alertsClient,
        id: undefined,
        ruleId: 'rule-1',
      });
      expect(rule).toEqual(getResult());
    });

    test('should return null if id and ruleId are undefined', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const rule = await readRules({
        alertsClient,
        id: undefined,
        ruleId: undefined,
      });
      expect(rule).toEqual(null);
    });
  });
});
