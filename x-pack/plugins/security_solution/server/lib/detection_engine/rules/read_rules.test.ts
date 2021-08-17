/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readRules } from './read_rules';
import { rulesClientMock } from '../../../../../alerting/server/mocks';
import { getAlertMock, getFindResultWithSingleHit } from '../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';
import { createRuleDataClientMock } from '../../../../../rule_registry/server/rule_data_client/rule_data_client.mock';

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
  let ruleDataClientMock = createRuleDataClientMock();
  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    ruleDataClientMock = createRuleDataClientMock();
  });
  describe('readRules', () => {
    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'should return the output from rulesClient if id is set but ruleId is undefined - %s',
      async (_, ruleDataClient) => {
        const rulesClient = rulesClientMock.create();
        rulesClient.get.mockResolvedValue(getAlertMock(getQueryRuleParams(ruleDataClient != null)));

        const rule = await readRules({
          isRuleRegistryEnabled: ruleDataClient != null,
          rulesClient,
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          ruleId: undefined,
        });
        expect(rule).toEqual(getAlertMock(getQueryRuleParams(ruleDataClient != null)));
      }
    );
    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'should return null if saved object found by alerts client given id is not alert type - %s',
      async (_, ruleDataClient) => {
        const rulesClient = rulesClientMock.create();
        const result = getAlertMock(getQueryRuleParams(ruleDataClient != null));
        // @ts-expect-error
        delete result.alertTypeId;
        rulesClient.get.mockResolvedValue(result);

        const rule = await readRules({
          isRuleRegistryEnabled: ruleDataClient != null,
          rulesClient,
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          ruleId: undefined,
        });
        expect(rule).toEqual(null);
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'should return error if alerts client throws 404 error on get - %s',
      async (_, ruleDataClient) => {
        const rulesClient = rulesClientMock.create();
        rulesClient.get.mockImplementation(() => {
          throw new TestError();
        });

        const rule = await readRules({
          isRuleRegistryEnabled: ruleDataClient != null,
          rulesClient,
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          ruleId: undefined,
        });
        expect(rule).toEqual(null);
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'should return error if alerts client throws error on get - %s',
      async (_, ruleDataClient) => {
        const rulesClient = rulesClientMock.create();
        rulesClient.get.mockImplementation(() => {
          throw new Error('Test error');
        });
        try {
          await readRules({
            isRuleRegistryEnabled: ruleDataClient != null,
            rulesClient,
            id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            ruleId: undefined,
          });
        } catch (exc) {
          expect(exc.message).toEqual('Test error');
        }
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'should return the output from rulesClient if id is undefined but ruleId is set - %s',
      async (_, ruleDataClient) => {
        const rulesClient = rulesClientMock.create();
        rulesClient.get.mockResolvedValue(getAlertMock(getQueryRuleParams(ruleDataClient != null)));
        rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(ruleDataClient != null));

        const rule = await readRules({
          isRuleRegistryEnabled: ruleDataClient != null,
          rulesClient,
          id: undefined,
          ruleId: 'rule-1',
        });
        expect(rule).toEqual(getAlertMock(getQueryRuleParams(ruleDataClient != null)));
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'should return null if the output from rulesClient with ruleId set is empty - %s',
      async (_, ruleDataClient) => {
        const rulesClient = rulesClientMock.create();
        rulesClient.get.mockResolvedValue(getAlertMock(getQueryRuleParams(ruleDataClient != null)));
        rulesClient.find.mockResolvedValue({ data: [], page: 0, perPage: 1, total: 0 });

        const rule = await readRules({
          isRuleRegistryEnabled: ruleDataClient != null,
          rulesClient,
          id: undefined,
          ruleId: 'rule-1',
        });
        expect(rule).toEqual(null);
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'should return the output from rulesClient if id is null but ruleId is set - %s',
      async (_, ruleDataClient) => {
        const rulesClient = rulesClientMock.create();
        rulesClient.get.mockResolvedValue(getAlertMock(getQueryRuleParams(ruleDataClient != null)));
        rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(ruleDataClient != null));

        const rule = await readRules({
          isRuleRegistryEnabled: ruleDataClient != null,
          rulesClient,
          id: undefined,
          ruleId: 'rule-1',
        });
        expect(rule).toEqual(getAlertMock(getQueryRuleParams(ruleDataClient != null)));
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('should return null if id and ruleId are undefined - %s', async (_, ruleDataClient) => {
      const rulesClient = rulesClientMock.create();
      rulesClient.get.mockResolvedValue(getAlertMock(getQueryRuleParams(ruleDataClient != null)));
      rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(ruleDataClient != null));

      const rule = await readRules({
        isRuleRegistryEnabled: ruleDataClient != null,
        rulesClient,
        id: undefined,
        ruleId: undefined,
      });
      expect(rule).toEqual(null);
    });
  });
});
