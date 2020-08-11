/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Readable } from 'stream';
import {
  transformAlertToRule,
  getIdError,
  transformFindAlerts,
  transform,
  transformTags,
  getIdBulkError,
  transformOrBulkError,
  transformAlertsToRules,
  transformOrImportError,
  getDuplicates,
  getTupleDuplicateErrorsAndUniqueRules,
} from './utils';
import { getResult } from '../__mocks__/request_responses';
import { INTERNAL_IDENTIFIER } from '../../../../../common/constants';
import { RuleTypeParams } from '../../types';
import { BulkError, ImportSuccessError } from '../utils';
import { getOutputRuleAlertForRest } from '../__mocks__/utils';
import { createPromiseFromStreams } from '../../../../../../../../src/legacy/utils/streams';
import { PartialAlert } from '../../../../../../alerts/server';
import { SanitizedAlert } from '../../../../../../alerts/server/types';
import { createRulesStreamFromNdJson } from '../../rules/create_rules_stream_from_ndjson';
import { RuleAlertType } from '../../rules/types';
import { CreateRulesBulkSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/create_rules_bulk_schema';
import { ImportRulesSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/import_rules_schema';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/create_rules_schema.mock';

type PromiseFromStreams = ImportRulesSchemaDecoded | Error;

describe('utils', () => {
  describe('transformAlertToRule', () => {
    test('should work with a full data set', () => {
      const fullRule = getResult();
      const rule = transformAlertToRule(fullRule);
      expect(rule).toEqual(getOutputRuleAlertForRest());
    });

    test('should work with a partial data set missing data', () => {
      const fullRule = getResult();
      const { from, language, ...omitParams } = fullRule.params;
      fullRule.params = omitParams as RuleTypeParams;
      const rule = transformAlertToRule(fullRule);
      const {
        from: from2,
        language: language2,
        ...expectedWithoutFromWithoutLanguage
      } = getOutputRuleAlertForRest();
      expect(rule).toEqual(expectedWithoutFromWithoutLanguage);
    });

    test('should omit query if query is undefined', () => {
      const fullRule = getResult();
      fullRule.params.query = undefined;
      const rule = transformAlertToRule(fullRule);
      const { query, ...expectedWithoutQuery } = getOutputRuleAlertForRest();
      expect(rule).toEqual(expectedWithoutQuery);
    });

    test('should omit a mix of undefined, null, and missing fields', () => {
      const fullRule = getResult();
      fullRule.params.query = undefined;
      fullRule.params.language = undefined;
      const { from, ...omitParams } = fullRule.params;
      fullRule.params = omitParams as RuleTypeParams;
      const { enabled, ...omitEnabled } = fullRule;
      const rule = transformAlertToRule(omitEnabled as RuleAlertType);
      const {
        from: from2,
        enabled: enabled2,
        language,
        query,
        ...expectedWithoutFromEnabledLanguageQuery
      } = getOutputRuleAlertForRest();
      expect(rule).toEqual(expectedWithoutFromEnabledLanguageQuery);
    });

    test('should return enabled is equal to false', () => {
      const fullRule = getResult();
      fullRule.enabled = false;
      const ruleWithEnabledFalse = transformAlertToRule(fullRule);
      const expected = getOutputRuleAlertForRest();
      expected.enabled = false;
      expect(ruleWithEnabledFalse).toEqual(expected);
    });

    test('should return immutable is equal to false', () => {
      const fullRule = getResult();
      fullRule.params.immutable = false;
      const ruleWithEnabledFalse = transformAlertToRule(fullRule);
      const expected = getOutputRuleAlertForRest();
      expect(ruleWithEnabledFalse).toEqual(expected);
    });

    test('should work with tags but filter out any internal tags', () => {
      const fullRule = getResult();
      fullRule.tags = ['tag 1', 'tag 2', `${INTERNAL_IDENTIFIER}_some_other_value`];
      const rule = transformAlertToRule(fullRule);
      const expected = getOutputRuleAlertForRest();
      expected.tags = ['tag 1', 'tag 2'];
      expect(rule).toEqual(expected);
    });

    test('transforms ML Rule fields', () => {
      const mlRule = getResult();
      mlRule.params.anomalyThreshold = 55;
      mlRule.params.machineLearningJobId = 'some_job_id';
      mlRule.params.type = 'machine_learning';

      const rule = transformAlertToRule(mlRule);
      expect(rule).toEqual(
        expect.objectContaining({
          anomaly_threshold: 55,
          machine_learning_job_id: 'some_job_id',
          type: 'machine_learning',
        })
      );
    });

    // This has to stay here until we do data migration of saved objects and lists is removed from:
    // signal_params_schema.ts
    test('does not leak a lists structure in the transform which would cause validation issues', () => {
      const result: RuleAlertType & { lists: [] } = { lists: [], ...getResult() };
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
        ...getResult(),
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
      const output = transformFindAlerts({ data: [], page: 1, perPage: 0, total: 0 }, []);
      expect(output).toEqual({ data: [], page: 1, perPage: 0, total: 0 });
    });

    test('outputs 200 if the data is of type siem alert', () => {
      const output = transformFindAlerts(
        {
          page: 1,
          perPage: 0,
          total: 0,
          data: [getResult()],
        },
        []
      );
      const expected = getOutputRuleAlertForRest();
      expect(output).toEqual({
        page: 1,
        perPage: 0,
        total: 0,
        data: [expected],
      });
    });

    test('returns 500 if the data is not of type siem alert', () => {
      const unsafeCast = ([{ name: 'something else' }] as unknown) as SanitizedAlert[];
      const output = transformFindAlerts(
        {
          data: unsafeCast,
          page: 1,
          perPage: 1,
          total: 1,
        },
        []
      );
      expect(output).toBeNull();
    });
  });

  describe('transform', () => {
    test('outputs 200 if the data is of type siem alert', () => {
      const output = transform(getResult());
      const expected = getOutputRuleAlertForRest();
      expect(output).toEqual(expected);
    });

    test('returns 500 if the data is not of type siem alert', () => {
      const unsafeCast = ({ data: [{ random: 1 }] } as unknown) as PartialAlert;
      const output = transform(unsafeCast);
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

  describe('transformOrBulkError', () => {
    test('outputs 200 if the data is of type siem alert', () => {
      const output = transformOrBulkError('rule-1', getResult(), {
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        actions: [],
        ruleThrottle: 'no_actions',
        alertThrottle: null,
      });
      const expected = getOutputRuleAlertForRest();
      expect(output).toEqual(expected);
    });

    test('returns 500 if the data is not of type siem alert', () => {
      const unsafeCast = ({ name: 'something else' } as unknown) as PartialAlert;
      const output = transformOrBulkError('rule-1', unsafeCast, {
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        actions: [],
        ruleThrottle: 'no_actions',
        alertThrottle: null,
      });
      const expected: BulkError = {
        rule_id: 'rule-1',
        error: { message: 'Internal error transforming', status_code: 500 },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('transformAlertsToRules', () => {
    test('given an empty array returns an empty array', () => {
      expect(transformAlertsToRules([])).toEqual([]);
    });

    test('given single alert will return the alert transformed', () => {
      const result1 = getResult();
      const transformed = transformAlertsToRules([result1]);
      const expected = getOutputRuleAlertForRest();
      expect(transformed).toEqual([expected]);
    });

    test('given two alerts will return the two alerts transformed', () => {
      const result1 = getResult();
      const result2 = getResult();
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

  describe('transformOrImportError', () => {
    test('returns 1 given success if the alert is an alert type and the existing success count is 0', () => {
      const output = transformOrImportError('rule-1', getResult(), {
        success: true,
        success_count: 0,
        errors: [],
      });
      const expected: ImportSuccessError = {
        success: true,
        errors: [],
        success_count: 1,
      };
      expect(output).toEqual(expected);
    });

    test('returns 2 given successes if the alert is an alert type and the existing success count is 1', () => {
      const output = transformOrImportError('rule-1', getResult(), {
        success: true,
        success_count: 1,
        errors: [],
      });
      const expected: ImportSuccessError = {
        success: true,
        errors: [],
        success_count: 2,
      };
      expect(output).toEqual(expected);
    });

    test('returns 1 error and success of false if the data is not of type siem alert', () => {
      const unsafeCast = ({ name: 'something else' } as unknown) as PartialAlert;
      const output = transformOrImportError('rule-1', unsafeCast, {
        success: true,
        success_count: 1,
        errors: [],
      });
      const expected: ImportSuccessError = {
        success: false,
        errors: [
          {
            rule_id: 'rule-1',
            error: {
              message: 'Internal error transforming',
              status_code: 500,
            },
          },
        ],
        success_count: 1,
      };
      expect(output).toEqual(expected);
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
        ] as CreateRulesBulkSchemaDecoded,
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
        ] as CreateRulesBulkSchemaDecoded,
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
