/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { CoreKibanaRequest } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

import { getRuleAttributes, getFakeKibanaRequest, loadRule } from './rule_loader';
import { TaskRunnerContext } from './task_runner_factory';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { rulesClientMock } from '../rules_client.mock';
import { Rule } from '../types';
import { MONITORING_HISTORY_LIMIT, RuleExecutionStatusErrorReasons } from '../../common';
import { getReasonFromError } from '../lib/error_with_reason';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';

// create mocks
const rulesClient = rulesClientMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const alertingEventLogger = alertingEventLoggerMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const mockBasePathService = { set: jest.fn() };

// assign default parameters/data
const apiKey = 'rule-apikey';
const ruleId = 'rule-id-1';
const enabled = true;
const spaceId = 'rule-spaceId';
const ruleName = 'rule-name';
const consumer = 'rule-consumer';
const ruleTypeId = 'rule-type-id';
const ruleParams = { paramA: 42 };

describe('rule_loader', () => {
  let context: TaskRunnerContext;
  let contextMock: ReturnType<typeof getTaskRunnerContext>;

  const paramValidator = schema.object({
    paramA: schema.number(),
  });

  const DefaultLoadRuleParams = {
    paramValidator,
    ruleId,
    spaceId,
    ruleTypeRegistry,
    alertingEventLogger,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjects.getDecryptedAsInternalUser.mockImplementation(
      mockGetDecrypted({
        apiKey,
        enabled,
        consumer,
      })
    );
    contextMock = getTaskRunnerContext(ruleParams, MONITORING_HISTORY_LIMIT);
    context = contextMock as unknown as TaskRunnerContext;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadRule()', () => {
    describe('succeeds', () => {
      test('with API key, a full execution history, and validator', async () => {
        const result = await loadRule({ ...DefaultLoadRuleParams, context });

        expect(result.apiKey).toBe(apiKey);
        expect(result.validatedParams).toEqual(ruleParams);
        expect(result.fakeRequest.headers.authorization).toEqual(`ApiKey ${apiKey}`);
        expect(result.rule.alertTypeId).toBe(ruleTypeId);
        expect(result.rule.name).toBe(ruleName);
        expect(result.rule.params).toBe(ruleParams);
        expect(result.rule.monitoring?.run.history.length).toBe(MONITORING_HISTORY_LIMIT - 1);
      });

      test('without API key, any execution history, or validator', async () => {
        encryptedSavedObjects.getDecryptedAsInternalUser.mockImplementation(
          mockGetDecrypted({ enabled, consumer })
        );

        contextMock = getTaskRunnerContext(ruleParams, 0);
        context = contextMock as unknown as TaskRunnerContext;

        const result = await loadRule({
          ...DefaultLoadRuleParams,
          context,
          paramValidator: undefined,
        });

        expect(result.apiKey).toBe(undefined);
        expect(result.validatedParams).toEqual(ruleParams);
        expect(result.fakeRequest.headers.authorization).toBe(undefined);
        expect(result.rule.alertTypeId).toBe(ruleTypeId);
        expect(result.rule.name).toBe(ruleName);
        expect(result.rule.params).toBe(ruleParams);
        expect(result.rule.monitoring?.run.history.length).toBe(0);
      });
    });

    test('throws when cannot decrypt attributes', async () => {
      encryptedSavedObjects.getDecryptedAsInternalUser.mockImplementation(() => {
        throw new Error('eso-error: 42');
      });

      let outcome = 'success';
      try {
        await loadRule({ ...DefaultLoadRuleParams, context });
      } catch (err) {
        outcome = 'failure';
        expect(err.message).toBe('eso-error: 42');
        expect(getReasonFromError(err)).toBe(RuleExecutionStatusErrorReasons.Decrypt);
      }
      expect(outcome).toBe('failure');
    });

    test('throws when rule is not enabled', async () => {
      encryptedSavedObjects.getDecryptedAsInternalUser.mockImplementation(
        mockGetDecrypted({ apiKey, enabled: false, consumer })
      );

      let outcome = 'success';
      try {
        await loadRule({ ...DefaultLoadRuleParams, context });
      } catch (err) {
        outcome = 'failure';
        expect(getReasonFromError(err)).toBe(RuleExecutionStatusErrorReasons.Disabled);
      }
      expect(outcome).toBe('failure');
    });

    test('throws when rule type is not enabled', async () => {
      ruleTypeRegistry.ensureRuleTypeEnabled.mockImplementation(() => {
        throw new Error('rule-type-not-enabled: 2112');
      });

      let outcome = 'success';
      try {
        await loadRule({ ...DefaultLoadRuleParams, context });
      } catch (err) {
        outcome = 'failure';
        expect(err.message).toBe('rule-type-not-enabled: 2112');
        expect(getReasonFromError(err)).toBe(RuleExecutionStatusErrorReasons.License);
      }
      expect(outcome).toBe('failure');
    });

    test('throws when rule params fail validation', async () => {
      const parameterValidator = schema.object({
        paramA: schema.string(),
      });

      let outcome = 'success';
      try {
        await loadRule({
          ...DefaultLoadRuleParams,
          context,
          paramValidator: parameterValidator,
        });
      } catch (err) {
        outcome = 'failure';
        expect(err.message).toMatch('[paramA]: expected value of type [string] but got [number]');
        expect(getReasonFromError(err)).toBe(RuleExecutionStatusErrorReasons.Validate);
      }
      expect(outcome).toBe('failure');
    });
  });

  describe('getDecryptedAttributes()', () => {
    test('succeeds with default space', async () => {
      contextMock.spaceIdToNamespace.mockReturnValue(undefined);
      const result = await getRuleAttributes(context, ruleId, 'default');

      expect(result.apiKey).toBe(apiKey);
      expect(result.consumer).toBe(consumer);
      expect(result.enabled).toBe(true);
      expect(result.fakeRequest).toEqual(expect.any(CoreKibanaRequest));
      expect(result.rule.alertTypeId).toBe(ruleTypeId);
      expect(result.rulesClient).toBeTruthy();
      expect(contextMock.spaceIdToNamespace.mock.calls[0]).toEqual(['default']);

      const esoArgs = encryptedSavedObjects.getDecryptedAsInternalUser.mock.calls[0];
      expect(esoArgs).toEqual(['alert', ruleId, { namespace: undefined }]);
    });

    test('succeeds with non-default space', async () => {
      contextMock.spaceIdToNamespace.mockReturnValue(spaceId);
      const result = await getRuleAttributes(context, ruleId, spaceId);

      expect(result.apiKey).toBe(apiKey);
      expect(result.consumer).toBe(consumer);
      expect(result.enabled).toBe(true);
      expect(result.fakeRequest).toEqual(expect.any(CoreKibanaRequest));
      expect(result.rule.alertTypeId).toBe(ruleTypeId);
      expect(result.rulesClient).toBeTruthy();
      expect(contextMock.spaceIdToNamespace.mock.calls[0]).toEqual([spaceId]);

      const esoArgs = encryptedSavedObjects.getDecryptedAsInternalUser.mock.calls[0];
      expect(esoArgs).toEqual(['alert', ruleId, { namespace: spaceId }]);
    });

    test('fails', async () => {
      encryptedSavedObjects.getDecryptedAsInternalUser.mockImplementation(
        async (type, id, opts) => {
          throw new Error('wops');
        }
      );

      const promise = getRuleAttributes(context, ruleId, spaceId);
      await expect(promise).rejects.toThrow('wops');
    });
  });

  describe('getFakeKibanaRequest()', () => {
    test('has API key, in default space', async () => {
      const kibanaRequestFromMock = jest.spyOn(CoreKibanaRequest, 'from');
      const fakeRequest = getFakeKibanaRequest(context, 'default', apiKey);

      const bpsSetParams = mockBasePathService.set.mock.calls[0];
      expect(bpsSetParams).toEqual([fakeRequest, '/']);
      expect(fakeRequest).toEqual(expect.any(CoreKibanaRequest));
      expect(kibanaRequestFromMock.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "headers": Object {
              "authorization": "ApiKey rule-apikey",
            },
            "path": "/",
            "raw": Object {
              "req": Object {
                "url": "/",
              },
            },
            "route": Object {
              "settings": Object {},
            },
            "url": Object {
              "href": "/",
            },
          },
        ]
      `);
    });

    test('has API key, in non-default space', async () => {
      const kibanaRequestFromMock = jest.spyOn(CoreKibanaRequest, 'from');
      const fakeRequest = getFakeKibanaRequest(context, spaceId, apiKey);

      const bpsSetParams = mockBasePathService.set.mock.calls[0];
      expect(bpsSetParams).toEqual([fakeRequest, '/s/rule-spaceId']);
      expect(fakeRequest).toEqual(expect.any(CoreKibanaRequest));
      expect(kibanaRequestFromMock.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "headers": Object {
              "authorization": "ApiKey rule-apikey",
            },
            "path": "/",
            "raw": Object {
              "req": Object {
                "url": "/",
              },
            },
            "route": Object {
              "settings": Object {},
            },
            "url": Object {
              "href": "/",
            },
          },
        ]
      `);
    });

    test('does not have API key, in default space', async () => {
      const kibanaRequestFromMock = jest.spyOn(CoreKibanaRequest, 'from');
      const fakeRequest = getFakeKibanaRequest(context, 'default', null);

      const bpsSetParams = mockBasePathService.set.mock.calls[0];
      expect(bpsSetParams).toEqual([fakeRequest, '/']);

      expect(fakeRequest).toEqual(expect.any(CoreKibanaRequest));
      expect(kibanaRequestFromMock.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "headers": Object {},
            "path": "/",
            "raw": Object {
              "req": Object {
                "url": "/",
              },
            },
            "route": Object {
              "settings": Object {},
            },
            "url": Object {
              "href": "/",
            },
          },
        ]
      `);
    });
  });
});

// returns a version of encryptedSavedObjects.getDecryptedAsInternalUser() with provided params
function mockGetDecrypted(attributes: { apiKey?: string; enabled: boolean; consumer: string }) {
  return async (type: string, id: string, opts_: unknown) => {
    return { id, type, references: [], attributes };
  };
}

// return enough of TaskRunnerContext that rule_loader needs
function getTaskRunnerContext(ruleParameters: unknown, historyElements: number) {
  return {
    spaceIdToNamespace: jest.fn(),
    encryptedSavedObjectsClient: encryptedSavedObjects,
    basePathService: mockBasePathService,
    getRulesClientWithRequest,
  };

  function getRulesClientWithRequest() {
    // only need get() mocked
    rulesClient.getAlertFromRaw.mockReturnValue({
      name: ruleName,
      alertTypeId: ruleTypeId,
      params: ruleParameters,
      monitoring: {
        run: {
          history: new Array(historyElements),
        },
      },
    } as Rule);
    return rulesClient;
  }
}
