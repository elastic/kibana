/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { transformDataToNdjson } from './create_stream_from_ndjson';
import { ImportRulesSchemaDecoded } from '../../../common/detection_engine/schemas/request/import_rules_schema';
import { getRulesSchemaMock } from '../../../common/detection_engine/schemas/response/rules_schema.mocks';

export const getOutputSample = (): Partial<ImportRulesSchemaDecoded> => ({
  rule_id: 'rule-1',
  output_index: '.siem-signals',
  risk_score: 50,
  description: 'some description',
  from: 'now-5m',
  to: 'now',
  index: ['index-1'],
  name: 'some-name',
  severity: 'low',
  interval: '5m',
  type: 'query',
});

export const getSampleAsNdjson = (sample: Partial<ImportRulesSchemaDecoded>): string => {
  return `${JSON.stringify(sample)}\n`;
};

describe('create_rules_stream_from_ndjson', () => {
  describe('transformDataToNdjson', () => {
    test('if rules are empty it returns an empty string', () => {
      const ruleNdjson = transformDataToNdjson([]);
      expect(ruleNdjson).toEqual('');
    });

    test('single rule will transform with new line ending character for ndjson', () => {
      const rule = getRulesSchemaMock();
      const ruleNdjson = transformDataToNdjson([rule]);
      expect(ruleNdjson.endsWith('\n')).toBe(true);
    });

    test('multiple rules will transform with two new line ending characters for ndjson', () => {
      const result1 = getRulesSchemaMock();
      const result2 = getRulesSchemaMock();
      result2.id = 'some other id';
      result2.rule_id = 'some other id';
      result2.name = 'Some other rule';

      const ruleNdjson = transformDataToNdjson([result1, result2]);
      // this is how we count characters in JavaScript :-)
      const count = ruleNdjson.split('\n').length - 1;
      expect(count).toBe(2);
    });

    test('you can parse two rules back out without errors', () => {
      const result1 = getRulesSchemaMock();
      const result2 = getRulesSchemaMock();
      result2.id = 'some other id';
      result2.rule_id = 'some other id';
      result2.name = 'Some other rule';

      const ruleNdjson = transformDataToNdjson([result1, result2]);
      const ruleStrings = ruleNdjson.split('\n');
      const reParsed1 = JSON.parse(ruleStrings[0]);
      const reParsed2 = JSON.parse(ruleStrings[1]);
      expect(reParsed1).toEqual(result1);
      expect(reParsed2).toEqual(result2);
    });
  });
});
