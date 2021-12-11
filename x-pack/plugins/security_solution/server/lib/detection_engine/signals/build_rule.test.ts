/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRuleWithOverrides, buildRuleWithoutOverrides } from './build_rule';
import { sampleDocNoSortId, expectedRule, sampleDocSeverity } from './__mocks__/es_results';
import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { INTERNAL_RULE_ID_KEY, INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';
import {
  getCompleteRuleMock,
  getQueryRuleParams,
  getThreatRuleParams,
} from '../schemas/rule_schemas.mock';
import {
  CompleteRule,
  QueryRuleParams,
  RuleParams,
  ThreatRuleParams,
} from '../schemas/rule_schemas';

describe('buildRuleWithoutOverrides', () => {
  let params: RuleParams;
  let completeRule: CompleteRule<QueryRuleParams>;

  beforeEach(() => {
    params = getQueryRuleParams();
    completeRule = getCompleteRuleMock<QueryRuleParams>(params);
  });

  test('builds a rule using rule alert', () => {
    const rule = buildRuleWithoutOverrides(completeRule);
    expect(rule).toEqual(expectedRule());
  });

  test('builds a rule and removes internal tags', () => {
    completeRule.ruleConfig.tags = [
      'some fake tag 1',
      'some fake tag 2',
      `${INTERNAL_RULE_ID_KEY}:rule-1`,
      `${INTERNAL_IMMUTABLE_KEY}:true`,
    ];
    const rule = buildRuleWithoutOverrides(completeRule);
    expect(rule.tags).toEqual(['some fake tag 1', 'some fake tag 2']);
  });

  test('it builds a rule as expected with filters present', () => {
    const ruleFilters = [
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
    completeRule.ruleParams.filters = ruleFilters;
    const rule = buildRuleWithoutOverrides(completeRule);
    expect(rule.filters).toEqual(ruleFilters);
  });

  test('it creates a indicator/threat_mapping/threat_matching rule', () => {
    const ruleParams: ThreatRuleParams = {
      ...getThreatRuleParams(),
      threatMapping: [
        {
          entries: [
            {
              field: 'host.name',
              value: 'host.name',
              type: 'mapping',
            },
          ],
        },
      ],
      threatFilters: [
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
            },
          },
        },
      ],
      threatIndicatorPath: 'some.path',
      threatQuery: 'threat_query',
      threatIndex: ['threat_index'],
      threatLanguage: 'kuery',
    };
    const threatMatchCompleteRule = getCompleteRuleMock<ThreatRuleParams>(ruleParams);
    const threatMatchRule = buildRuleWithoutOverrides(threatMatchCompleteRule);
    const expected: Partial<RulesSchema> = {
      threat_mapping: ruleParams.threatMapping,
      threat_filters: ruleParams.threatFilters,
      threat_indicator_path: ruleParams.threatIndicatorPath,
      threat_query: ruleParams.threatQuery,
      threat_index: ruleParams.threatIndex,
      threat_language: ruleParams.threatLanguage,
    };
    expect(threatMatchRule).toEqual(expect.objectContaining(expected));
  });
});

describe('buildRuleWithOverrides', () => {
  let params: RuleParams;
  let completeRule: CompleteRule<QueryRuleParams>;

  beforeEach(() => {
    params = getQueryRuleParams();
    completeRule = getCompleteRuleMock<QueryRuleParams>(params);
  });

  test('it applies rule name override in buildRule', () => {
    completeRule.ruleParams.ruleNameOverride = 'someKey';
    const rule = buildRuleWithOverrides(completeRule, sampleDocNoSortId()._source!);
    const expected = {
      ...expectedRule(),
      name: 'someValue',
      rule_name_override: 'someKey',
      meta: {
        ruleNameOverridden: true,
        someMeta: 'someField',
      },
    };
    expect(rule).toEqual(expected);
  });

  test('it applies risk score override in buildRule', () => {
    const newRiskScore = 79;
    completeRule.ruleParams.riskScoreMapping = [
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
    const rule = buildRuleWithOverrides(completeRule, doc._source!);
    const expected = {
      ...expectedRule(),
      risk_score: newRiskScore,
      risk_score_mapping: completeRule.ruleParams.riskScoreMapping,
      meta: {
        riskScoreOverridden: true,
        someMeta: 'someField',
      },
    };
    expect(rule).toEqual(expected);
  });

  test('it applies severity override in buildRule', () => {
    const eventSeverity = '42';
    completeRule.ruleParams.severityMapping = [
      {
        field: 'event.severity',
        value: eventSeverity,
        operator: 'equals',
        severity: 'critical',
      },
    ];
    const doc = sampleDocSeverity(Number(eventSeverity));
    const rule = buildRuleWithOverrides(completeRule, doc._source!);
    const expected = {
      ...expectedRule(),
      severity: 'critical',
      severity_mapping: completeRule.ruleParams.severityMapping,
      meta: {
        severityOverrideField: 'event.severity',
        someMeta: 'someField',
      },
    };
    expect(rule).toEqual(expected);
  });
});
