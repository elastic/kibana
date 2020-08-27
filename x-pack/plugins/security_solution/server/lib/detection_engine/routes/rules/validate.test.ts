/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  transformValidate,
  transformValidateFindAlerts,
  transformValidateBulkError,
} from './validate';
import { getResult } from '../__mocks__/request_responses';
import { FindResult } from '../../../../../../alerts/server';
import { BulkError } from '../utils';
import { RulesSchema } from '../../../../../common/detection_engine/schemas/response/rules_schema';
import { getListArrayMock } from '../../../../../common/detection_engine/schemas/types/lists.mock';

export const ruleOutput: RulesSchema = {
  actions: [],
  author: ['Elastic'],
  created_at: '2019-12-13T16:40:33.400Z',
  updated_at: '2019-12-13T16:40:33.400Z',
  created_by: 'elastic',
  description: 'Detecting root and admin users',
  enabled: true,
  false_positives: [],
  from: 'now-6m',
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  immutable: false,
  interval: '5m',
  rule_id: 'rule-1',
  language: 'kuery',
  license: 'Elastic License',
  output_index: '.siem-signals',
  max_signals: 100,
  risk_score: 50,
  risk_score_mapping: [],
  name: 'Detect Root/Admin Users',
  query: 'user.name: root or user.name: admin',
  references: ['http://www.example.com', 'https://ww.example.com'],
  severity: 'high',
  severity_mapping: [],
  updated_by: 'elastic',
  tags: [],
  to: 'now',
  type: 'query',
  throttle: 'no_actions',
  threat: [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        id: 'TA0040',
        name: 'impact',
        reference: 'https://attack.mitre.org/tactics/TA0040/',
      },
      technique: [
        {
          id: 'T1499',
          name: 'endpoint denial of service',
          reference: 'https://attack.mitre.org/techniques/T1499/',
        },
      ],
    },
  ],
  version: 1,
  filters: [
    {
      query: {
        match_phrase: {
          'host.name': 'some-host',
        },
      },
    },
  ],
  exceptions_list: getListArrayMock(),
  index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  meta: {
    someMeta: 'someField',
  },
  note: '# Investigative notes',
  timeline_title: 'some-timeline-title',
  timeline_id: 'some-timeline-id',
};

describe('validate', () => {
  describe('transformValidate', () => {
    test('it should do a validation correctly of a partial alert', () => {
      const ruleAlert = getResult();
      const [validated, errors] = transformValidate(ruleAlert);
      expect(validated).toEqual(ruleOutput);
      expect(errors).toEqual(null);
    });

    test('it should do an in-validation correctly of a partial alert', () => {
      const ruleAlert = getResult();
      // @ts-expect-error
      delete ruleAlert.name;
      const [validated, errors] = transformValidate(ruleAlert);
      expect(validated).toEqual(null);
      expect(errors).toEqual('Invalid value "undefined" supplied to "name"');
    });
  });

  describe('transformValidateFindAlerts', () => {
    test('it should do a validation correctly of a find alert', () => {
      const findResult: FindResult = { data: [getResult()], page: 1, perPage: 0, total: 0 };
      const [validated, errors] = transformValidateFindAlerts(findResult, []);
      expect(validated).toEqual({ data: [ruleOutput], page: 1, perPage: 0, total: 0 });
      expect(errors).toEqual(null);
    });

    test('it should do an in-validation correctly of a partial alert', () => {
      const findResult: FindResult = { data: [getResult()], page: 1, perPage: 0, total: 0 };
      // @ts-expect-error
      delete findResult.page;
      const [validated, errors] = transformValidateFindAlerts(findResult, []);
      expect(validated).toEqual(null);
      expect(errors).toEqual('Invalid value "undefined" supplied to "page"');
    });
  });

  describe('transformValidateBulkError', () => {
    test('it should do a validation correctly of a rule id', () => {
      const ruleAlert = getResult();
      const validatedOrError = transformValidateBulkError('rule-1', ruleAlert);
      expect(validatedOrError).toEqual(ruleOutput);
    });

    test('it should do an in-validation correctly of a rule id', () => {
      const ruleAlert = getResult();
      // @ts-expect-error
      delete ruleAlert.name;
      const validatedOrError = transformValidateBulkError('rule-1', ruleAlert);
      const expected: BulkError = {
        error: {
          message: 'Invalid value "undefined" supplied to "name"',
          status_code: 500,
        },
        rule_id: 'rule-1',
      };
      expect(validatedOrError).toEqual(expected);
    });
  });
});
