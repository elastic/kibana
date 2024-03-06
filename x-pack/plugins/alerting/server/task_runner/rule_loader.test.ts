/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { CoreKibanaRequest, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

import { getRuleAttributes, getFakeKibanaRequest, validateRule } from './rule_loader';
import { TaskRunnerContext } from './task_runner_factory';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { rulesClientMock } from '../rules_client.mock';
import { Rule } from '../types';
import { MONITORING_HISTORY_LIMIT, RuleExecutionStatusErrorReasons } from '../../common';
import { ErrorWithReason, getReasonFromError } from '../lib/error_with_reason';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { mockedRawRuleSO, mockedRule } from './fixtures';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { getErrorSource, TaskErrorSource } from '@kbn/task-manager-plugin/server/task_running';

// create mocks
const rulesClient = rulesClientMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const alertingEventLogger = alertingEventLoggerMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const mockBasePathService = { set: jest.fn() };

// assign default parameters/data
const apiKey = mockedRawRuleSO.attributes.apiKey!;
const ruleId = 'rule-id-1';
const enabled = true;
const spaceId = 'rule-spaceId';
const ruleName = mockedRule.name;
const consumer = mockedRule.consumer;
const ruleTypeId = mockedRule.alertTypeId;
const ruleParams = mockedRule.params;

describe('rule_loader', () => {
  let context: TaskRunnerContext;
  let contextMock: ReturnType<typeof getTaskRunnerContext>;

  const paramValidator = schema.object({
    bar: schema.boolean(),
  });

  const getDefaultValidateRuleParams = ({
    fakeRequest,
    error,
    enabled: ruleEnabled = true,
    params = mockedRule.params,
  }: {
    fakeRequest: CoreKibanaRequest<unknown, unknown, unknown>;
    error?: ErrorWithReason;
    enabled?: boolean;
    params?: typeof mockedRule.params;
  }) => ({
    paramValidator,
    ruleId,
    spaceId,
    ruleTypeRegistry,
    alertingEventLogger,
    ruleData: error
      ? { error }
      : {
          data: {
            indirectParams: { ...mockedRawRuleSO.attributes, enabled: ruleEnabled },
            rule: { ...mockedRule, params },
            rulesClient,
            version: '1',
            fakeRequest,
          },
        },
  });

  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjects.getDecryptedAsInternalUser.mockImplementation(
      mockGetDecrypted({
        ...mockedRawRuleSO.attributes,
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

  describe('validateRule()', () => {
    describe('succeeds', () => {
      test('validates and returns the results', () => {
        const fakeRequest = getFakeKibanaRequest(context, 'default', apiKey);
        const result = validateRule({
          ...getDefaultValidateRuleParams({ fakeRequest }),
          context,
        });

        expect(result.apiKey).toBe(apiKey);
        expect(result.validatedParams).toEqual(ruleParams);
        expect(result.fakeRequest.headers.authorization).toEqual(`ApiKey ${apiKey}`);
        expect(result.rule.alertTypeId).toBe(ruleTypeId);
        expect(result.rule.name).toBe(ruleName);
        expect(result.rule.params).toBe(ruleParams);
        expect(result.indirectParams).toEqual(mockedRawRuleSO.attributes);
        expect(result.version).toBe('1');
        expect(result.rulesClient).toBe(rulesClient);
      });
    });

    test('throws when there is decrypt attributes error', () => {
      const fakeRequest = getFakeKibanaRequest(context, 'default', apiKey);
      let outcome = 'success';
      try {
        validateRule({
          ...getDefaultValidateRuleParams({
            fakeRequest,
            error: new ErrorWithReason(RuleExecutionStatusErrorReasons.Decrypt, new Error('test')),
          }),
          context,
        });
      } catch (err) {
        outcome = 'failure';
        expect(getReasonFromError(err)).toBe(RuleExecutionStatusErrorReasons.Decrypt);
      }
      expect(outcome).toBe('failure');
    });

    test('throws when rule is not enabled', async () => {
      const fakeRequest = getFakeKibanaRequest(context, 'default', apiKey);
      let outcome = 'success';
      try {
        validateRule({
          ...getDefaultValidateRuleParams({ fakeRequest, enabled: false }),
          context,
        });
      } catch (err) {
        outcome = 'failure';
        expect(getReasonFromError(err)).toBe(RuleExecutionStatusErrorReasons.Disabled);
        expect(getErrorSource(err)).toBe(TaskErrorSource.FRAMEWORK);
      }
      expect(outcome).toBe('failure');
    });

    test('throws when rule type is not enabled', async () => {
      const fakeRequest = getFakeKibanaRequest(context, 'default', apiKey);
      ruleTypeRegistry.ensureRuleTypeEnabled.mockImplementation(() => {
        throw new Error('rule-type-not-enabled: 2112');
      });

      let outcome = 'success';
      try {
        validateRule({
          ...getDefaultValidateRuleParams({ fakeRequest }),
          context,
        });
      } catch (err) {
        outcome = 'failure';
        expect(err.message).toBe('rule-type-not-enabled: 2112');
        expect(getReasonFromError(err)).toBe(RuleExecutionStatusErrorReasons.License);
        expect(getErrorSource(err)).toBe(TaskErrorSource.USER);
      }
      expect(outcome).toBe('failure');
    });

    test('throws when rule params fail validation', async () => {
      const fakeRequest = getFakeKibanaRequest(context, 'default', apiKey);
      let outcome = 'success';
      try {
        validateRule({
          ...getDefaultValidateRuleParams({ fakeRequest, params: { bar: 'foo' } }),
          context,
        });
      } catch (err) {
        outcome = 'failure';
        expect(err.message).toMatch('[bar]: expected value of type [boolean] but got [string]');
        expect(getReasonFromError(err)).toBe(RuleExecutionStatusErrorReasons.Validate);
        expect(getErrorSource(err)).toBe(TaskErrorSource.USER);
      }
      expect(outcome).toBe('failure');
    });
  });

  describe('getDecryptedAttributes()', () => {
    test('succeeds with default space', async () => {
      contextMock.spaceIdToNamespace.mockReturnValue(undefined);
      const result = await getRuleAttributes(context, ruleId, 'default');

      expect(result.fakeRequest).toEqual(expect.any(CoreKibanaRequest));
      expect(result.rule.alertTypeId).toBe(ruleTypeId);
      expect(result.indirectParams).toEqual({
        ...mockedRawRuleSO.attributes,
        apiKey,
        enabled,
        consumer,
      });
      expect(result.rulesClient).toBeTruthy();
      expect(contextMock.spaceIdToNamespace.mock.calls[0]).toEqual(['default']);

      const esoArgs = encryptedSavedObjects.getDecryptedAsInternalUser.mock.calls[0];
      expect(esoArgs).toEqual([RULE_SAVED_OBJECT_TYPE, ruleId, { namespace: undefined }]);
    });

    test('succeeds with non-default space', async () => {
      contextMock.spaceIdToNamespace.mockReturnValue(spaceId);
      const result = await getRuleAttributes(context, ruleId, spaceId);

      expect(result.fakeRequest).toEqual(expect.any(CoreKibanaRequest));
      expect(result.rule.alertTypeId).toBe(ruleTypeId);
      expect(result.rulesClient).toBeTruthy();
      expect(contextMock.spaceIdToNamespace.mock.calls[0]).toEqual([spaceId]);
      expect(result.indirectParams).toEqual({
        ...mockedRawRuleSO.attributes,
        apiKey,
        enabled,
        consumer,
      });

      const esoArgs = encryptedSavedObjects.getDecryptedAsInternalUser.mock.calls[0];
      expect(esoArgs).toEqual([RULE_SAVED_OBJECT_TYPE, ruleId, { namespace: spaceId }]);
    });

    test('fails', async () => {
      encryptedSavedObjects.getDecryptedAsInternalUser.mockImplementation(
        async (type, id, opts) => {
          throw new Error('wops');
        }
      );

      try {
        await getRuleAttributes(context, ruleId, spaceId);
      } catch (e) {
        expect(e.message).toMatch('wops');
        expect(getErrorSource(e)).toBe(TaskErrorSource.FRAMEWORK);
      }
    });

    test('returns USER error for a "not found SO"', async () => {
      encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError()
      );

      try {
        await getRuleAttributes(context, ruleId, spaceId);
      } catch (e) {
        expect(e.message).toMatch('Not Found');
        expect(getErrorSource(e)).toBe(TaskErrorSource.USER);
      }
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
              "authorization": "ApiKey MTIzOmFiYw==",
            },
            "path": "/",
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
              "authorization": "ApiKey MTIzOmFiYw==",
            },
            "path": "/",
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
