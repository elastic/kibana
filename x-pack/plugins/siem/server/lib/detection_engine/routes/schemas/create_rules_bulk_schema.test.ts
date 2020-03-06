/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRulesBulkSchema } from './create_rules_bulk_schema';
import { PatchRuleAlertParamsRest } from '../../rules/types';

// only the basics of testing are here.
// see: create_rules_schema.test.ts for the bulk of the validation tests
// this just wraps createRulesSchema in an array
describe('create_rules_bulk_schema', () => {
  test('can take an empty array and validate it', () => {
    expect(
      createRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([]).error
    ).toBeFalsy();
  });

  test('made up values do not validate', () => {
    expect(
      createRulesBulkSchema.validate<[{ madeUp: string }]>([
        {
          madeUp: 'hi',
        },
      ]).error
    ).toBeTruthy();
  });

  test('single array of [id] does validate', () => {
    expect(
      createRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([
        {
          rule_id: 'rule-1',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          name: 'some-name',
          severity: 'low',
          type: 'query',
          query: 'some query',
          index: ['index-1'],
          interval: '5m',
        },
      ]).error
    ).toBeFalsy();
  });

  test('two values of [id] does validate', () => {
    expect(
      createRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([
        {
          rule_id: 'rule-1',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          name: 'some-name',
          severity: 'low',
          type: 'query',
          query: 'some query',
          index: ['index-1'],
          interval: '5m',
        },
        {
          rule_id: 'rule-2',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          name: 'some-name',
          severity: 'low',
          type: 'query',
          query: 'some query',
          index: ['index-1'],
          interval: '5m',
        },
      ]).error
    ).toBeFalsy();
  });

  test('The default for "from" will be "now-6m"', () => {
    expect(
      createRulesBulkSchema.validate<Partial<PatchRuleAlertParamsRest>>([
        {
          rule_id: 'rule-1',
          risk_score: 50,
          description: 'some description',
          name: 'some-name',
          severity: 'low',
          type: 'query',
          references: ['index-1'],
          query: 'some query',
          language: 'kuery',
          max_signals: 1,
          version: 1,
        },
      ]).value[0].from
    ).toEqual('now-6m');
  });

  test('The default for "to" will be "now"', () => {
    expect(
      createRulesBulkSchema.validate<Partial<PatchRuleAlertParamsRest>>([
        {
          rule_id: 'rule-1',
          risk_score: 50,
          description: 'some description',
          name: 'some-name',
          severity: 'low',
          type: 'query',
          references: ['index-1'],
          query: 'some query',
          language: 'kuery',
          max_signals: 1,
          version: 1,
        },
      ]).value[0].to
    ).toEqual('now');
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    expect(
      createRulesBulkSchema.validate<Partial<PatchRuleAlertParamsRest>>([
        {
          rule_id: 'rule-1',
          risk_score: 50,
          description: 'some description',
          name: 'some-name',
          severity: 'junk',
          type: 'query',
          references: ['index-1'],
          query: 'some query',
          language: 'kuery',
          max_signals: 1,
          version: 1,
        },
      ]).error.message
    ).toEqual(
      '"value" at position 0 fails because [child "severity" fails because ["severity" must be one of [low, medium, high, critical]]]'
    );
  });
});
