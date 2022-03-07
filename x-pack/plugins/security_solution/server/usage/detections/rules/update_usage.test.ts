/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMetric, RulesTypeUsage } from './types';
import { updateRuleUsage } from './update_usage';
import { getInitialRulesUsage } from './get_initial_usage';

interface StubRuleOptions {
  ruleType: string;
  enabled: boolean;
  elasticRule: boolean;
  alertCount: number;
  caseCount: number;
  hasLegacyNotification: boolean;
  hasNotification: boolean;
}

const createStubRule = ({
  ruleType,
  enabled,
  elasticRule,
  alertCount,
  caseCount,
  hasLegacyNotification,
  hasNotification,
}: StubRuleOptions): RuleMetric => ({
  rule_name: 'rule-name',
  rule_id: 'id-123',
  rule_type: ruleType,
  rule_version: 1,
  enabled,
  elastic_rule: elasticRule,
  created_on: '2022-01-06T20:02:45.306Z',
  updated_on: '2022-01-06T20:02:45.306Z',
  alert_count_daily: alertCount,
  cases_count_total: caseCount,
  has_legacy_notification: hasLegacyNotification,
  has_notification: hasNotification,
});

describe('Detections Usage and Metrics', () => {
  describe('Update metrics with rule information', () => {
    it('Should update elastic and eql rule metric total', async () => {
      const stubRule = createStubRule({
        ruleType: 'eql',
        enabled: true,
        elasticRule: true,
        alertCount: 1,
        caseCount: 1,
        hasLegacyNotification: false,
        hasNotification: false,
      });
      const usage = updateRuleUsage(stubRule, getInitialRulesUsage());

      expect(usage).toEqual<RulesTypeUsage>({
        ...getInitialRulesUsage(),
        elastic_total: {
          alerts: 1,
          cases: 1,
          disabled: 0,
          enabled: 1,
          legacy_notifications_enabled: 0,
          legacy_notifications_disabled: 0,
          notifications_enabled: 0,
          notifications_disabled: 0,
        },
        eql: {
          alerts: 1,
          cases: 1,
          disabled: 0,
          enabled: 1,
          legacy_notifications_enabled: 0,
          legacy_notifications_disabled: 0,
          notifications_enabled: 0,
          notifications_disabled: 0,
        },
      });
    });

    it('Should update based on multiple metrics', async () => {
      const stubEqlRule = createStubRule({
        ruleType: 'eql',
        enabled: true,
        elasticRule: true,
        alertCount: 1,
        caseCount: 1,
        hasLegacyNotification: false,
        hasNotification: false,
      });
      const stubQueryRuleOne = createStubRule({
        ruleType: 'query',
        enabled: true,
        elasticRule: true,
        alertCount: 5,
        caseCount: 2,
        hasLegacyNotification: false,
        hasNotification: false,
      });
      const stubQueryRuleTwo = createStubRule({
        ruleType: 'query',
        enabled: true,
        elasticRule: false,
        alertCount: 5,
        caseCount: 2,
        hasLegacyNotification: false,
        hasNotification: false,
      });
      const stubMachineLearningOne = createStubRule({
        ruleType: 'machine_learning',
        enabled: false,
        elasticRule: false,
        alertCount: 0,
        caseCount: 10,
        hasLegacyNotification: false,
        hasNotification: false,
      });
      const stubMachineLearningTwo = createStubRule({
        ruleType: 'machine_learning',
        enabled: true,
        elasticRule: true,
        alertCount: 22,
        caseCount: 44,
        hasLegacyNotification: false,
        hasNotification: false,
      });

      let usage = updateRuleUsage(stubEqlRule, getInitialRulesUsage());
      usage = updateRuleUsage(stubQueryRuleOne, usage);
      usage = updateRuleUsage(stubQueryRuleTwo, usage);
      usage = updateRuleUsage(stubMachineLearningOne, usage);
      usage = updateRuleUsage(stubMachineLearningTwo, usage);

      expect(usage).toEqual<RulesTypeUsage>({
        ...getInitialRulesUsage(),
        custom_total: {
          alerts: 5,
          cases: 12,
          disabled: 1,
          enabled: 1,
          legacy_notifications_enabled: 0,
          legacy_notifications_disabled: 0,
          notifications_enabled: 0,
          notifications_disabled: 0,
        },
        elastic_total: {
          alerts: 28,
          cases: 47,
          disabled: 0,
          enabled: 3,
          legacy_notifications_enabled: 0,
          legacy_notifications_disabled: 0,
          notifications_enabled: 0,
          notifications_disabled: 0,
        },
        eql: {
          alerts: 1,
          cases: 1,
          disabled: 0,
          enabled: 1,
          legacy_notifications_enabled: 0,
          legacy_notifications_disabled: 0,
          notifications_enabled: 0,
          notifications_disabled: 0,
        },
        machine_learning: {
          alerts: 22,
          cases: 54,
          disabled: 1,
          enabled: 1,
          legacy_notifications_enabled: 0,
          legacy_notifications_disabled: 0,
          notifications_enabled: 0,
          notifications_disabled: 0,
        },
        query: {
          alerts: 10,
          cases: 4,
          disabled: 0,
          enabled: 2,
          legacy_notifications_enabled: 0,
          legacy_notifications_disabled: 0,
          notifications_enabled: 0,
          notifications_disabled: 0,
        },
      });
    });

    describe('table tests of "ruleType", "enabled", "elasticRule", and "legacyNotification"', () => {
      test.each`
        ruleType              | enabled  | hasLegacyNotification | hasNotification | expectedLegacyNotificationsEnabled | expectedLegacyNotificationsDisabled | expectedNotificationsEnabled | expectedNotificationsDisabled
        ${'eql'}              | ${true}  | ${true}               | ${false}        | ${1}                               | ${0}                                | ${0}                         | ${0}
        ${'eql'}              | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}
        ${'eql'}              | ${false} | ${false}              | ${true}         | ${0}                               | ${0}                                | ${0}                         | ${1}
        ${'eql'}              | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}
        ${'eql'}              | ${false} | ${true}               | ${false}        | ${0}                               | ${1}                                | ${0}                         | ${0}
        ${'eql'}              | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}
        ${'query'}            | ${true}  | ${true}               | ${false}        | ${1}                               | ${0}                                | ${0}                         | ${0}
        ${'query'}            | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}
        ${'query'}            | ${false} | ${false}              | ${true}         | ${0}                               | ${0}                                | ${0}                         | ${1}
        ${'query'}            | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}
        ${'query'}            | ${false} | ${true}               | ${false}        | ${0}                               | ${1}                                | ${0}                         | ${0}
        ${'query'}            | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}
        ${'threshold'}        | ${true}  | ${true}               | ${false}        | ${1}                               | ${0}                                | ${0}                         | ${0}
        ${'threshold'}        | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}
        ${'threshold'}        | ${false} | ${false}              | ${true}         | ${0}                               | ${0}                                | ${0}                         | ${1}
        ${'threshold'}        | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}
        ${'threshold'}        | ${false} | ${true}               | ${false}        | ${0}                               | ${1}                                | ${0}                         | ${0}
        ${'threshold'}        | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}
        ${'machine_learning'} | ${true}  | ${true}               | ${false}        | ${1}                               | ${0}                                | ${0}                         | ${0}
        ${'machine_learning'} | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}
        ${'machine_learning'} | ${false} | ${false}              | ${true}         | ${0}                               | ${0}                                | ${0}                         | ${1}
        ${'machine_learning'} | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}
        ${'machine_learning'} | ${false} | ${true}               | ${false}        | ${0}                               | ${1}                                | ${0}                         | ${0}
        ${'machine_learning'} | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}
        ${'threat_match'}     | ${true}  | ${true}               | ${false}        | ${1}                               | ${0}                                | ${0}                         | ${0}
        ${'threat_match'}     | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}
        ${'threat_match'}     | ${false} | ${false}              | ${true}         | ${0}                               | ${0}                                | ${0}                         | ${1}
        ${'threat_match'}     | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}
        ${'threat_match'}     | ${false} | ${true}               | ${false}        | ${0}                               | ${1}                                | ${0}                         | ${0}
        ${'threat_match'}     | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}
      `(
        'expect { "ruleType": $ruleType, "enabled": $enabled, "hasLegacyNotification": $hasLegacyNotification, "hasNotification": $hasNotification } to equal { legacy_notifications_enabled: $expectedLegacyNotificationsEnabled, legacy_notifications_disabled: $expectedLegacyNotificationsDisabled, notifications_enabled: $expectedNotificationsEnabled, notifications_disabled, $expectedNotificationsDisabled }',
        ({
          ruleType,
          enabled,
          hasLegacyNotification,
          hasNotification,
          expectedLegacyNotificationsEnabled,
          expectedLegacyNotificationsDisabled,
          expectedNotificationsEnabled,
          expectedNotificationsDisabled,
        }) => {
          const rule1 = createStubRule({
            ruleType,
            enabled,
            elasticRule: false,
            hasLegacyNotification,
            hasNotification,
            alertCount: 0,
            caseCount: 0,
          });
          const usage = updateRuleUsage(rule1, getInitialRulesUsage()) as ReturnType<
            typeof updateRuleUsage
          > & { [key: string]: unknown };
          expect(usage[ruleType]).toEqual(
            expect.objectContaining({
              legacy_notifications_enabled: expectedLegacyNotificationsEnabled,
              legacy_notifications_disabled: expectedLegacyNotificationsDisabled,
              notifications_enabled: expectedNotificationsEnabled,
              notifications_disabled: expectedNotificationsDisabled,
            })
          );

          // extra test where we add everything by 1 to ensure that the addition happens with the correct rule type
          const rule2 = createStubRule({
            ruleType,
            enabled,
            elasticRule: false,
            hasLegacyNotification,
            hasNotification,
            alertCount: 0,
            caseCount: 0,
          });
          const usageAddedByOne = updateRuleUsage(rule2, usage) as ReturnType<
            typeof updateRuleUsage
          > & { [key: string]: unknown };

          expect(usageAddedByOne[ruleType]).toEqual(
            expect.objectContaining({
              legacy_notifications_enabled:
                expectedLegacyNotificationsEnabled !== 0
                  ? expectedLegacyNotificationsEnabled + 1
                  : 0,
              legacy_notifications_disabled:
                expectedLegacyNotificationsDisabled !== 0
                  ? expectedLegacyNotificationsDisabled + 1
                  : 0,
              notifications_enabled:
                expectedNotificationsEnabled !== 0 ? expectedNotificationsEnabled + 1 : 0,
              notifications_disabled:
                expectedNotificationsDisabled !== 0 ? expectedNotificationsDisabled + 1 : 0,
            })
          );
        }
      );
    });
  });
});
