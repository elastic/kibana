/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformValidate, transformValidateBulkError } from './validate';
import { BulkError } from '../utils';
import { RulesSchema } from '../../../../../common/detection_engine/schemas/response';
import { getAlertMock, getFindResultStatus } from '../__mocks__/request_responses';
import { getListArrayMock } from '../../../../../common/detection_engine/schemas/types/lists.mock';
import { getThreatMock } from '../../../../../common/detection_engine/schemas/types/threat.mock';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';

export const ruleOutput = (): RulesSchema => ({
  actions: [],
  author: ['Elastic'],
  building_block_type: 'default',
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
  max_signals: 10000,
  risk_score: 50,
  risk_score_mapping: [],
  name: 'Detect Root/Admin Users',
  query: 'user.name: root or user.name: admin',
  references: ['http://example.com', 'https://example.com'],
  severity: 'high',
  severity_mapping: [],
  updated_by: 'elastic',
  tags: [],
  to: 'now',
  type: 'query',
  throttle: 'no_actions',
  threat: getThreatMock(),
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
});

describe('validate', () => {
  describe('transformValidate', () => {
    test('it should do a validation correctly of a partial alert', () => {
      const ruleAlert = getAlertMock(getQueryRuleParams());
      const [validated, errors] = transformValidate(ruleAlert);
      expect(validated).toEqual(ruleOutput());
      expect(errors).toEqual(null);
    });

    test('it should do an in-validation correctly of a partial alert', () => {
      const ruleAlert = getAlertMock(getQueryRuleParams());
      // @ts-expect-error
      delete ruleAlert.name;
      const [validated, errors] = transformValidate(ruleAlert);
      expect(validated).toEqual(null);
      expect(errors).toEqual('Invalid value "undefined" supplied to "name"');
    });
  });

  describe('transformValidateBulkError', () => {
    test('it should do a validation correctly of a rule id', () => {
      const ruleAlert = getAlertMock(getQueryRuleParams());
      const validatedOrError = transformValidateBulkError('rule-1', ruleAlert);
      expect(validatedOrError).toEqual(ruleOutput());
    });

    test('it should do an in-validation correctly of a rule id', () => {
      const ruleAlert = getAlertMock(getQueryRuleParams());
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

    test('it should do a validation correctly of a rule id with ruleStatus passed in', () => {
      const ruleStatus = getFindResultStatus();
      const ruleAlert = getAlertMock(getQueryRuleParams());
      const validatedOrError = transformValidateBulkError('rule-1', ruleAlert, null, ruleStatus);
      const expected: RulesSchema = {
        ...ruleOutput(),
        status: 'succeeded',
        status_date: '2020-02-18T15:26:49.783Z',
        last_success_at: '2020-02-18T15:26:49.783Z',
        last_success_message: 'succeeded',
      };
      expect(validatedOrError).toEqual(expected);
    });

    test('it should return error object if "alert" is not expected alert type', () => {
      const ruleAlert = getAlertMock(getQueryRuleParams());
      // @ts-expect-error
      delete ruleAlert.alertTypeId;
      const validatedOrError = transformValidateBulkError('rule-1', ruleAlert);
      const expected: BulkError = {
        error: {
          message: 'Internal error transforming',
          status_code: 500,
        },
        rule_id: 'rule-1',
      };
      expect(validatedOrError).toEqual(expected);
    });
  });
});
