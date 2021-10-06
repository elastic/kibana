/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { createPromiseFromStreams } from '@kbn/utils';

import {
  transformAlertToRule,
  getIdError,
  transformFindAlerts,
  transform,
  transformTags,
  getIdBulkError,
  transformAlertsToRules,
  getDuplicates,
  getTupleDuplicateErrorsAndUniqueRules,
} from './utils';
import { getAlertMock } from '../__mocks__/request_responses';
import { INTERNAL_IDENTIFIER } from '../../../../../common/constants';
import { PartialFilter } from '../../types';
import { BulkError } from '../utils';
import { getOutputRuleAlertForRest } from '../__mocks__/utils';
import { PartialAlert } from '../../../../../../alerting/server';
import { createRulesStreamFromNdJson } from '../../rules/create_rules_stream_from_ndjson';
import { RuleAlertType } from '../../rules/types';
import { ImportRulesSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/import_rules_schema';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import { CreateRulesBulkSchema } from '../../../../../common/detection_engine/schemas/request';
import {
  getMlRuleParams,
  getQueryRuleParams,
  getThreatRuleParams,
} from '../../schemas/rule_schemas.mock';
// eslint-disable-next-line no-restricted-imports
import { LegacyRulesActionsSavedObject } from '../../rule_actions/legacy_get_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { LegacyRuleAlertAction } from '../../rule_actions/legacy_types';

type PromiseFromStreams = ImportRulesSchemaDecoded | Error;

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('utils - %s', (_, isRuleRegistryEnabled) => {
  describe('transformAlertToRule', () => {
    test('should work with a full data set', () => {
      const fullRule = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      const rule = transformAlertToRule(fullRule);
      expect(rule).toEqual(getOutputRuleAlertForRest());
    });

    test('should omit note if note is undefined', () => {
      const fullRule = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      fullRule.params.note = undefined;
      const rule = transformAlertToRule(fullRule);
      const { note, ...expectedWithoutNote } = getOutputRuleAlertForRest();
      expect(rule).toEqual(expectedWithoutNote);
    });

    test('should return enabled is equal to false', () => {
      const fullRule = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      fullRule.enabled = false;
      const ruleWithEnabledFalse = transformAlertToRule(fullRule);
      const expected = getOutputRuleAlertForRest();
      expected.enabled = false;
      expect(ruleWithEnabledFalse).toEqual(expected);
    });

    test('should return immutable is equal to false', () => {
      const fullRule = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      fullRule.params.immutable = false;
      const ruleWithEnabledFalse = transformAlertToRule(fullRule);
      const expected = getOutputRuleAlertForRest();
      expect(ruleWithEnabledFalse).toEqual(expected);
    });

    test('should work with tags but filter out any internal tags', () => {
      const fullRule = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      fullRule.tags = ['tag 1', 'tag 2', `${INTERNAL_IDENTIFIER}_some_other_value`];
      const rule = transformAlertToRule(fullRule);
      const expected = getOutputRuleAlertForRest();
      expected.tags = ['tag 1', 'tag 2'];
      expect(rule).toEqual(expected);
    });

    test('transforms ML Rule fields', () => {
      const mlRule = getAlertMock(isRuleRegistryEnabled, getMlRuleParams());
      mlRule.params.anomalyThreshold = 55;
      mlRule.params.machineLearningJobId = ['some_job_id'];
      mlRule.params.type = 'machine_learning';

      const rule = transformAlertToRule(mlRule);
      expect(rule).toEqual(
        expect.objectContaining({
          anomaly_threshold: 55,
          machine_learning_job_id: ['some_job_id'],
          type: 'machine_learning',
        })
      );
    });

    test('transforms threat_matching fields', () => {
      const threatRule = getAlertMock(isRuleRegistryEnabled, getThreatRuleParams());
      const threatFilters: PartialFilter[] = [
        {
          query: {
            bool: {
              must: [
                {
                  query_string: {
                    query: 'host.name: linux',
                    analyze_wildcard: true,
                    time_zone: 'Zulu',
                  },
                },
              ],
              filter: [],
              should: [],
              must_not: [],
            },
          },
        },
      ];
      const threatMapping: ThreatMapping = [
        {
          entries: [
            {
              field: 'host.name',
              value: 'host.name',
              type: 'mapping',
            },
          ],
        },
      ];
      threatRule.params.threatIndex = ['index-123'];
      threatRule.params.threatFilters = threatFilters;
      threatRule.params.threatMapping = threatMapping;
      threatRule.params.threatQuery = '*:*';

      const rule = transformAlertToRule(threatRule);
      expect(rule).toEqual(
        expect.objectContaining({
          threat_index: ['index-123'],
          threat_filters: threatFilters,
          threat_mapping: threatMapping,
          threat_query: '*:*',
        })
      );
    });

    // This has to stay here until we do data migration of saved objects and lists is removed from:
    // signal_params_schema.ts
    test('does not leak a lists structure in the transform which would cause validation issues', () => {
      const result: RuleAlertType & { lists: [] } = {
        lists: [],
        ...getAlertMock(isRuleRegistryEnabled, getQueryRuleParams()),
      };
      const rule = transformAlertToRule(result);
      expect(rule).toEqual(
        expect.not.objectContaining({
          lists: [],
        })
      );
    });

    // This has to stay here until we do data migration of saved objects and exceptions_list is removed from:
    // signal_params_schema.ts
    test('does not leak an exceptions_list structure in the transform which would cause validation issues', () => {
      const result: RuleAlertType & { exceptions_list: [] } = {
        exceptions_list: [],
        ...getAlertMock(isRuleRegistryEnabled, getQueryRuleParams()),
      };
      const rule = transformAlertToRule(result);
      expect(rule).toEqual(
        expect.not.objectContaining({
          exceptions_list: [],
        })
      );
    });
  });

  describe('getIdError', () => {
    test('it should have a status code', () => {
      const error = getIdError({ id: '123', ruleId: undefined });
      expect(error).toEqual({
        message: 'id: "123" not found',
        statusCode: 404,
      });
    });

    test('outputs message about id not being found if only id is defined and ruleId is undefined', () => {
      const error = getIdError({ id: '123', ruleId: undefined });
      expect(error).toEqual({
        message: 'id: "123" not found',
        statusCode: 404,
      });
    });

    test('outputs message about id not being found if only id is defined and ruleId is null', () => {
      const error = getIdError({ id: '123', ruleId: null });
      expect(error).toEqual({
        message: 'id: "123" not found',
        statusCode: 404,
      });
    });

    test('outputs message about ruleId not being found if only ruleId is defined and id is undefined', () => {
      const error = getIdError({ id: undefined, ruleId: 'rule-id-123' });
      expect(error).toEqual({
        message: 'rule_id: "rule-id-123" not found',
        statusCode: 404,
      });
    });

    test('outputs message about ruleId not being found if only ruleId is defined and id is null', () => {
      const error = getIdError({ id: null, ruleId: 'rule-id-123' });
      expect(error).toEqual({
        message: 'rule_id: "rule-id-123" not found',
        statusCode: 404,
      });
    });

    test('outputs message about both being not defined when both are undefined', () => {
      const error = getIdError({ id: undefined, ruleId: undefined });
      expect(error).toEqual({
        message: 'id or rule_id should have been defined',
        statusCode: 404,
      });
    });

    test('outputs message about both being not defined when both are null', () => {
      const error = getIdError({ id: null, ruleId: null });
      expect(error).toEqual({
        message: 'id or rule_id should have been defined',
        statusCode: 404,
      });
    });

    test('outputs message about both being not defined when id is null and ruleId is undefined', () => {
      const error = getIdError({ id: null, ruleId: undefined });
      expect(error).toEqual({
        message: 'id or rule_id should have been defined',
        statusCode: 404,
      });
    });

    test('outputs message about both being not defined when id is undefined and ruleId is null', () => {
      const error = getIdError({ id: undefined, ruleId: null });
      expect(error).toEqual({
        message: 'id or rule_id should have been defined',
        statusCode: 404,
      });
    });
  });

  describe('transformFindAlerts', () => {
    test('outputs empty data set when data set is empty correct', () => {
      const output = transformFindAlerts({ data: [], page: 1, perPage: 0, total: 0 }, {}, {});
      expect(output).toEqual({ data: [], page: 1, perPage: 0, total: 0 });
    });

    test('outputs 200 if the data is of type siem alert', () => {
      const output = transformFindAlerts(
        {
          page: 1,
          perPage: 0,
          total: 0,
          data: [getAlertMock(isRuleRegistryEnabled, getQueryRuleParams())],
        },
        {},
        {}
      );
      const expected = getOutputRuleAlertForRest();
      expect(output).toEqual({
        page: 1,
        perPage: 0,
        total: 0,
        data: [expected],
      });
    });

    test('outputs 200 if the data is of type siem alert and has undefined for the legacyRuleActions', () => {
      const output = transformFindAlerts(
        {
          page: 1,
          perPage: 0,
          total: 0,
          data: [getAlertMock(isRuleRegistryEnabled, getQueryRuleParams())],
        },
        {},
        {
          '123': undefined,
        }
      );
      const expected = getOutputRuleAlertForRest();
      expect(output).toEqual({
        page: 1,
        perPage: 0,
        total: 0,
        data: [expected],
      });
    });

    test('outputs 200 if the data is of type siem alert and has a legacy rule action', () => {
      const actions: LegacyRuleAlertAction[] = [
        {
          id: '456',
          params: {},
          group: '',
          action_type_id: 'action_123',
        },
      ];

      const legacyRuleActions: Record<string, LegacyRulesActionsSavedObject | undefined> = {
        [getAlertMock(isRuleRegistryEnabled, getQueryRuleParams()).id]: {
          id: '123',
          actions,
          alertThrottle: '1h',
          ruleThrottle: '1h',
        },
      };
      const output = transformFindAlerts(
        {
          page: 1,
          perPage: 0,
          total: 0,
          data: [getAlertMock(isRuleRegistryEnabled, getQueryRuleParams())],
        },
        {},
        legacyRuleActions
      );
      const expected = {
        ...getOutputRuleAlertForRest(),
        throttle: '1h',
        actions,
      };
      expect(output).toEqual({
        page: 1,
        perPage: 0,
        total: 0,
        data: [expected],
      });
    });
  });

  describe('transform', () => {
    test('outputs 200 if the data is of type siem alert', () => {
      const output = transform(
        getAlertMock(isRuleRegistryEnabled, getQueryRuleParams()),
        undefined,
        isRuleRegistryEnabled
      );
      const expected = getOutputRuleAlertForRest();
      expect(output).toEqual(expected);
    });

    test('returns 500 if the data is not of type siem alert', () => {
      const unsafeCast = { data: [{ random: 1 }] } as unknown as PartialAlert;
      const output = transform(unsafeCast, undefined, isRuleRegistryEnabled);
      expect(output).toBeNull();
    });
  });

  describe('transformTags', () => {
    test('it returns tags that have no internal structures', () => {
      expect(transformTags(['tag 1', 'tag 2'])).toEqual(['tag 1', 'tag 2']);
    });

    test('it returns empty tags given empty tags', () => {
      expect(transformTags([])).toEqual([]);
    });

    test('it returns tags with internal tags stripped out', () => {
      expect(transformTags(['tag 1', `${INTERNAL_IDENTIFIER}_some_value`, 'tag 2'])).toEqual([
        'tag 1',
        'tag 2',
      ]);
    });
  });

  describe('getIdBulkError', () => {
    test('outputs message about id and rule_id not being found if both are not null', () => {
      const error = getIdBulkError({ id: '123', ruleId: '456' });
      const expected: BulkError = {
        id: '123',
        rule_id: '456',
        error: { message: 'id: "123" and rule_id: "456" not found', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about id not being found if only id is defined and ruleId is undefined', () => {
      const error = getIdBulkError({ id: '123', ruleId: undefined });
      const expected: BulkError = {
        id: '123',
        error: { message: 'id: "123" not found', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about id not being found if only id is defined and ruleId is null', () => {
      const error = getIdBulkError({ id: '123', ruleId: null });
      const expected: BulkError = {
        id: '123',
        error: { message: 'id: "123" not found', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about ruleId not being found if only ruleId is defined and id is undefined', () => {
      const error = getIdBulkError({ id: undefined, ruleId: 'rule-id-123' });
      const expected: BulkError = {
        rule_id: 'rule-id-123',
        error: { message: 'rule_id: "rule-id-123" not found', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about ruleId not being found if only ruleId is defined and id is null', () => {
      const error = getIdBulkError({ id: null, ruleId: 'rule-id-123' });
      const expected: BulkError = {
        rule_id: 'rule-id-123',
        error: { message: 'rule_id: "rule-id-123" not found', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about both being not defined when both are undefined', () => {
      const error = getIdBulkError({ id: undefined, ruleId: undefined });
      const expected: BulkError = {
        rule_id: '(unknown id)',
        error: { message: 'id or rule_id should have been defined', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about both being not defined when both are null', () => {
      const error = getIdBulkError({ id: null, ruleId: null });
      const expected: BulkError = {
        rule_id: '(unknown id)',
        error: { message: 'id or rule_id should have been defined', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about both being not defined when id is null and ruleId is undefined', () => {
      const error = getIdBulkError({ id: null, ruleId: undefined });
      const expected: BulkError = {
        rule_id: '(unknown id)',
        error: { message: 'id or rule_id should have been defined', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about both being not defined when id is undefined and ruleId is null', () => {
      const error = getIdBulkError({ id: undefined, ruleId: null });
      const expected: BulkError = {
        rule_id: '(unknown id)',
        error: { message: 'id or rule_id should have been defined', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });
  });

  describe('transformAlertsToRules', () => {
    test('given an empty array returns an empty array', () => {
      expect(transformAlertsToRules([])).toEqual([]);
    });

    test('given single alert will return the alert transformed', () => {
      const result1 = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      const transformed = transformAlertsToRules([result1]);
      const expected = getOutputRuleAlertForRest();
      expect(transformed).toEqual([expected]);
    });

    test('given two alerts will return the two alerts transformed', () => {
      const result1 = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      const result2 = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      result2.id = 'some other id';
      result2.params.ruleId = 'some other id';

      const transformed = transformAlertsToRules([result1, result2]);
      const expected1 = getOutputRuleAlertForRest();
      const expected2 = getOutputRuleAlertForRest();
      expected2.id = 'some other id';
      expected2.rule_id = 'some other id';
      expect(transformed).toEqual([expected1, expected2]);
    });
  });

  describe('getDuplicates', () => {
    test("returns array of ruleIds showing the duplicate keys of 'value2' and 'value3'", () => {
      const output = getDuplicates(
        [
          { rule_id: 'value1' },
          { rule_id: 'value2' },
          { rule_id: 'value2' },
          { rule_id: 'value3' },
          { rule_id: 'value3' },
          {},
          {},
        ] as CreateRulesBulkSchema,
        'rule_id'
      );
      const expected = ['value2', 'value3'];
      expect(output).toEqual(expected);
    });
    test('returns null when given a map of no duplicates', () => {
      const output = getDuplicates(
        [
          { rule_id: 'value1' },
          { rule_id: 'value2' },
          { rule_id: 'value3' },
          {},
          {},
        ] as CreateRulesBulkSchema,
        'rule_id'
      );
      const expected: string[] = [];
      expect(output).toEqual(expected);
    });
  });

  describe('getTupleDuplicateErrorsAndUniqueRules', () => {
    test('returns tuple of empty duplicate errors array and rule array with instance of Syntax Error when imported rule contains parse error', async () => {
      const multipartPayload =
        '{"name"::"Simple Rule Query","description":"Simple Rule Query","risk_score":1,"rule_id":"rule-1","severity":"high","type":"query","query":"user.name: root or user.name: admin"}\n';
      const ndJsonStream = new Readable({
        read() {
          this.push(multipartPayload);
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const [errors, output] = getTupleDuplicateErrorsAndUniqueRules(parsedObjects, false);
      const isInstanceOfError = output[0] instanceof Error;

      expect(isInstanceOfError).toEqual(true);
      expect(errors.length).toEqual(0);
    });

    test('returns tuple of duplicate conflict error and single rule when rules with matching rule-ids passed in and `overwrite` is false', async () => {
      const rule = getCreateRulesSchemaMock('rule-1');
      const rule2 = getCreateRulesSchemaMock('rule-1');
      const ndJsonStream = new Readable({
        read() {
          this.push(`${JSON.stringify(rule)}\n`);
          this.push(`${JSON.stringify(rule2)}\n`);
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const [errors, output] = getTupleDuplicateErrorsAndUniqueRules(parsedObjects, false);

      expect(output.length).toEqual(1);
      expect(errors).toEqual([
        {
          error: {
            message: 'More than one rule with rule-id: "rule-1" found',
            status_code: 400,
          },
          rule_id: 'rule-1',
        },
      ]);
    });

    test('returns tuple of duplicate conflict error and single rule when rules with matching ids passed in and `overwrite` is false', async () => {
      const rule = getCreateRulesSchemaMock('rule-1');
      delete rule.rule_id;
      const rule2 = getCreateRulesSchemaMock('rule-1');
      delete rule2.rule_id;
      const ndJsonStream = new Readable({
        read() {
          this.push(`${JSON.stringify(rule)}\n`);
          this.push(`${JSON.stringify(rule2)}\n`);
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const [errors, output] = getTupleDuplicateErrorsAndUniqueRules(parsedObjects, false);
      const isInstanceOfError = output[0] instanceof Error;

      expect(isInstanceOfError).toEqual(true);
      expect(errors).toEqual([]);
    });

    test('returns tuple of empty duplicate errors array and single rule when rules with matching rule-ids passed in and `overwrite` is true', async () => {
      const rule = getCreateRulesSchemaMock('rule-1');
      const rule2 = getCreateRulesSchemaMock('rule-1');
      const ndJsonStream = new Readable({
        read() {
          this.push(`${JSON.stringify(rule)}\n`);
          this.push(`${JSON.stringify(rule2)}\n`);
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const [errors, output] = getTupleDuplicateErrorsAndUniqueRules(parsedObjects, true);

      expect(output.length).toEqual(1);
      expect(errors.length).toEqual(0);
    });

    test('returns tuple of empty duplicate errors array and single rule when rules without a rule-id is passed in', async () => {
      const simpleRule = getCreateRulesSchemaMock();
      delete simpleRule.rule_id;
      const multipartPayload = `${JSON.stringify(simpleRule)}\n`;
      const ndJsonStream = new Readable({
        read() {
          this.push(multipartPayload);
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const [errors, output] = getTupleDuplicateErrorsAndUniqueRules(parsedObjects, false);
      const isInstanceOfError = output[0] instanceof Error;

      expect(isInstanceOfError).toEqual(true);
      expect(errors.length).toEqual(0);
    });
  });
});
