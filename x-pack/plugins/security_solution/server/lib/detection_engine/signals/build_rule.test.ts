/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildRule, removeInternalTagsFromRule, buildRuleWithoutOverrides } from './build_rule';
import {
  sampleDocNoSortId,
  sampleRuleAlertParams,
  sampleRuleGuid,
  sampleRuleSO,
} from './__mocks__/es_results';
import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { getListArrayMock } from '../../../../common/detection_engine/schemas/types/lists.mock';
import { INTERNAL_RULE_ID_KEY, INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';
import { getRulesSchemaMock } from '../../../../common/detection_engine/schemas/response/rules_schema.mocks';

describe('buildRule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it builds a rule as expected with filters present', () => {
    const ruleParams = sampleRuleAlertParams();
    ruleParams.filters = [
      {
        query: 'host.name: Rebecca',
      },
      {
        query: 'host.name: Evan',
      },
      {
        query: 'host.name: Braden',
      },
    ];
    const rule = buildRule({
      actions: [],
      doc: sampleDocNoSortId(),
      ruleParams,
      name: 'some-name',
      id: sampleRuleGuid,
      enabled: false,
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: 'some interval',
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    const expected: Partial<RulesSchema> = {
      actions: [],
      author: ['Elastic'],
      building_block_type: 'default',
      created_by: 'elastic',
      description: 'Detecting root and admin users',
      enabled: false,
      false_positives: [],
      from: 'now-6m',
      id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      immutable: false,
      index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      interval: 'some interval',
      language: 'kuery',
      license: 'Elastic License',
      max_signals: 10000,
      name: 'some-name',
      output_index: '.siem-signals',
      query: 'user.name: root or user.name: admin',
      references: ['http://google.com'],
      risk_score: 50,
      risk_score_mapping: [],
      rule_id: 'rule-1',
      severity: 'high',
      severity_mapping: [],
      tags: ['some fake tag 1', 'some fake tag 2'],
      threat: [],
      to: 'now',
      type: 'query',
      note: '',
      updated_by: 'elastic',
      updated_at: rule.updated_at,
      created_at: rule.created_at,
      throttle: 'no_actions',
      filters: [
        {
          query: 'host.name: Rebecca',
        },
        {
          query: 'host.name: Evan',
        },
        {
          query: 'host.name: Braden',
        },
      ],
      exceptions_list: getListArrayMock(),
      version: 1,
    };
    expect(rule).toEqual(expected);
  });

  test('it omits a null value such as if "enabled" is null if is present', () => {
    const ruleParams = sampleRuleAlertParams();
    ruleParams.filters = undefined;
    const rule = buildRule({
      actions: [],
      doc: sampleDocNoSortId(),
      ruleParams,
      name: 'some-name',
      id: sampleRuleGuid,
      enabled: true,
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: 'some interval',
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    const expected: Partial<RulesSchema> = {
      actions: [],
      author: ['Elastic'],
      building_block_type: 'default',
      created_by: 'elastic',
      description: 'Detecting root and admin users',
      enabled: true,
      false_positives: [],
      from: 'now-6m',
      id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      immutable: false,
      index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      interval: 'some interval',
      language: 'kuery',
      license: 'Elastic License',
      max_signals: 10000,
      name: 'some-name',
      output_index: '.siem-signals',
      query: 'user.name: root or user.name: admin',
      references: ['http://google.com'],
      risk_score: 50,
      risk_score_mapping: [],
      rule_id: 'rule-1',
      severity: 'high',
      severity_mapping: [],
      tags: ['some fake tag 1', 'some fake tag 2'],
      threat: [],
      to: 'now',
      type: 'query',
      note: '',
      updated_by: 'elastic',
      version: 1,
      updated_at: rule.updated_at,
      created_at: rule.created_at,
      throttle: 'no_actions',
      exceptions_list: getListArrayMock(),
    };
    expect(rule).toEqual(expected);
  });

  test('it omits a null value such as if "filters" is undefined if is present', () => {
    const ruleParams = sampleRuleAlertParams();
    ruleParams.filters = undefined;
    const rule = buildRule({
      actions: [],
      doc: sampleDocNoSortId(),
      ruleParams,
      name: 'some-name',
      id: sampleRuleGuid,
      enabled: true,
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: 'some interval',
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    const expected: Partial<RulesSchema> = {
      actions: [],
      author: ['Elastic'],
      building_block_type: 'default',
      created_by: 'elastic',
      description: 'Detecting root and admin users',
      enabled: true,
      false_positives: [],
      from: 'now-6m',
      id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      immutable: false,
      index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      interval: 'some interval',
      language: 'kuery',
      license: 'Elastic License',
      max_signals: 10000,
      name: 'some-name',
      note: '',
      output_index: '.siem-signals',
      query: 'user.name: root or user.name: admin',
      references: ['http://google.com'],
      risk_score: 50,
      risk_score_mapping: [],
      rule_id: 'rule-1',
      severity: 'high',
      severity_mapping: [],
      tags: ['some fake tag 1', 'some fake tag 2'],
      threat: [],
      to: 'now',
      type: 'query',
      updated_by: 'elastic',
      version: 1,
      updated_at: rule.updated_at,
      created_at: rule.created_at,
      throttle: 'no_actions',
      exceptions_list: getListArrayMock(),
    };
    expect(rule).toEqual(expected);
  });

  test('it builds a rule and removes internal tags', () => {
    const ruleParams = sampleRuleAlertParams();
    const rule = buildRule({
      actions: [],
      doc: sampleDocNoSortId(),
      ruleParams,
      name: 'some-name',
      id: sampleRuleGuid,
      enabled: false,
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: 'some interval',
      tags: [
        'some fake tag 1',
        'some fake tag 2',
        `${INTERNAL_RULE_ID_KEY}:rule-1`,
        `${INTERNAL_IMMUTABLE_KEY}:true`,
      ],
      throttle: 'no_actions',
    });
    const expected: Partial<RulesSchema> = {
      actions: [],
      author: ['Elastic'],
      building_block_type: 'default',
      created_by: 'elastic',
      description: 'Detecting root and admin users',
      enabled: false,
      false_positives: [],
      from: 'now-6m',
      id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      immutable: false,
      index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      interval: 'some interval',
      language: 'kuery',
      license: 'Elastic License',
      max_signals: 10000,
      name: 'some-name',
      output_index: '.siem-signals',
      query: 'user.name: root or user.name: admin',
      references: ['http://google.com'],
      risk_score: 50,
      risk_score_mapping: [],
      rule_id: 'rule-1',
      severity: 'high',
      severity_mapping: [],
      tags: ['some fake tag 1', 'some fake tag 2'],
      threat: [],
      to: 'now',
      type: 'query',
      note: '',
      updated_by: 'elastic',
      updated_at: rule.updated_at,
      created_at: rule.created_at,
      throttle: 'no_actions',
      exceptions_list: getListArrayMock(),
      version: 1,
    };
    expect(rule).toEqual(expected);
  });
});

describe('removeInternalTagsFromRule', () => {
  test('it removes internal tags from a typical rule', () => {
    const rule = getRulesSchemaMock();
    rule.tags = [
      'some fake tag 1',
      'some fake tag 2',
      `${INTERNAL_RULE_ID_KEY}:rule-1`,
      `${INTERNAL_IMMUTABLE_KEY}:true`,
    ];
    const noInternals = removeInternalTagsFromRule(rule);
    expect(noInternals).toEqual(getRulesSchemaMock());
  });

  test('it works with an empty array', () => {
    const rule = getRulesSchemaMock();
    rule.tags = [];
    const noInternals = removeInternalTagsFromRule(rule);
    const expected = getRulesSchemaMock();
    expected.tags = [];
    expect(noInternals).toEqual(expected);
  });

  test('it works if tags contains normal values and no internal values', () => {
    const rule = getRulesSchemaMock();
    const noInternals = removeInternalTagsFromRule(rule);
    expect(noInternals).toEqual(rule);
  });
});

describe('buildRuleWithoutOverrides', () => {
  test('builds a rule using rule SO', () => {
    const ruleSO = sampleRuleSO();
    const rule = buildRuleWithoutOverrides(ruleSO);
    expect(rule).toEqual({
      actions: [],
      author: ['Elastic'],
      building_block_type: 'default',
      id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      rule_id: 'rule-1',
      false_positives: [],
      max_signals: 10000,
      risk_score: 50,
      risk_score_mapping: [],
      output_index: '.siem-signals',
      description: 'Detecting root and admin users',
      from: 'now-6m',
      immutable: false,
      index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      interval: '5m',
      language: 'kuery',
      license: 'Elastic License',
      name: 'rule-name',
      query: 'user.name: root or user.name: admin',
      references: ['http://google.com'],
      severity: 'high',
      severity_mapping: [],
      tags: ['some fake tag 1', 'some fake tag 2'],
      threat: [],
      type: 'query',
      to: 'now',
      note: '',
      enabled: true,
      created_by: 'sample user',
      updated_by: 'sample user',
      version: 1,
      updated_at: ruleSO.updated_at ?? '',
      created_at: ruleSO.attributes.createdAt,
      throttle: 'no_actions',
      exceptions_list: getListArrayMock(),
    });
  });

  test('builds a rule using rule SO and removes internal tags', () => {
    const ruleSO = sampleRuleSO();
    ruleSO.attributes.tags = [
      'some fake tag 1',
      'some fake tag 2',
      `${INTERNAL_RULE_ID_KEY}:rule-1`,
      `${INTERNAL_IMMUTABLE_KEY}:true`,
    ];
    const rule = buildRuleWithoutOverrides(ruleSO);
    expect(rule).toEqual({
      actions: [],
      author: ['Elastic'],
      building_block_type: 'default',
      id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      rule_id: 'rule-1',
      false_positives: [],
      max_signals: 10000,
      risk_score: 50,
      risk_score_mapping: [],
      output_index: '.siem-signals',
      description: 'Detecting root and admin users',
      from: 'now-6m',
      immutable: false,
      index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      interval: '5m',
      language: 'kuery',
      license: 'Elastic License',
      name: 'rule-name',
      query: 'user.name: root or user.name: admin',
      references: ['http://google.com'],
      severity: 'high',
      severity_mapping: [],
      tags: ['some fake tag 1', 'some fake tag 2'],
      threat: [],
      type: 'query',
      to: 'now',
      note: '',
      enabled: true,
      created_by: 'sample user',
      updated_by: 'sample user',
      version: 1,
      updated_at: ruleSO.updated_at ?? '',
      created_at: ruleSO.attributes.createdAt,
      throttle: 'no_actions',
      exceptions_list: getListArrayMock(),
    });
  });
});
