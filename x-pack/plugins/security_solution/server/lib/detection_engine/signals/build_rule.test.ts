/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  buildRule,
  removeInternalTagsFromRule,
  buildRuleWithOverrides,
  buildRuleWithoutOverrides,
} from './build_rule';
import {
  sampleDocNoSortId,
  sampleRuleAlertParams,
  sampleRuleGuid,
  sampleRuleSO,
  expectedRule,
  sampleDocSeverity,
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
    expect(rule).toEqual(expectedRule());
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
    expect(rule).toEqual(expectedRule());
  });
});

describe('buildRuleWithOverrides', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it builds a rule as expected with filters present', () => {
    const ruleSO = sampleRuleSO();
    ruleSO.attributes.params.filters = [
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
    const rule = buildRuleWithOverrides(ruleSO, sampleDocNoSortId()._source);
    const expected: RulesSchema = {
      ...expectedRule(),
      filters: ruleSO.attributes.params.filters,
    };
    expect(rule).toEqual(expected);
  });

  test('it builds a rule and removes internal tags', () => {
    const ruleSO = sampleRuleSO();
    ruleSO.attributes.tags = [
      'some fake tag 1',
      'some fake tag 2',
      `${INTERNAL_RULE_ID_KEY}:rule-1`,
      `${INTERNAL_IMMUTABLE_KEY}:true`,
    ];
    const rule = buildRuleWithOverrides(ruleSO, sampleDocNoSortId()._source);
    expect(rule).toEqual(expectedRule());
  });

  test('it applies rule name override in buildRule', () => {
    const ruleSO = sampleRuleSO();
    ruleSO.attributes.params.ruleNameOverride = 'someKey';
    const rule = buildRuleWithOverrides(ruleSO, sampleDocNoSortId()._source);
    const expected = {
      ...expectedRule(),
      name: 'someValue',
      rule_name_override: 'someKey',
      meta: {
        ruleNameOverridden: true,
      },
    };
    expect(rule).toEqual(expected);
  });

  test('it applies risk score override in buildRule', () => {
    const newRiskScore = 79;
    const ruleSO = sampleRuleSO();
    ruleSO.attributes.params.riskScoreMapping = [
      {
        field: 'new_risk_score',
        // value and risk_score aren't used for anything but are required in the schema
        value: '',
        operator: 'equals',
        risk_score: undefined,
      },
    ];
    const doc = sampleDocNoSortId();
    doc._source.new_risk_score = newRiskScore;
    const rule = buildRuleWithOverrides(ruleSO, doc._source);
    const expected = {
      ...expectedRule(),
      risk_score: newRiskScore,
      risk_score_mapping: ruleSO.attributes.params.riskScoreMapping,
      meta: {
        riskScoreOverridden: true,
      },
    };
    expect(rule).toEqual(expected);
  });

  test('it applies severity override in buildRule', () => {
    const eventSeverity = '42';
    const ruleSO = sampleRuleSO();
    ruleSO.attributes.params.severityMapping = [
      {
        field: 'event.severity',
        value: eventSeverity,
        operator: 'equals',
        severity: 'critical',
      },
    ];
    const doc = sampleDocSeverity(Number(eventSeverity));
    const rule = buildRuleWithOverrides(ruleSO, doc._source);
    const expected = {
      ...expectedRule(),
      severity: 'critical',
      severity_mapping: ruleSO.attributes.params.severityMapping,
      meta: {
        severityOverrideField: 'event.severity',
      },
    };
    expect(rule).toEqual(expected);
  });
});
