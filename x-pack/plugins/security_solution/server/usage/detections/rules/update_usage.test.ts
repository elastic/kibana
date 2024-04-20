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
  hasLegacyInvestigationField: boolean;
  hasAlertSuppressionPerExecution: boolean;
  hasAlertSuppressionPerPeriod: boolean;
  hasAlertSuppressionMissingFieldsStrategySuppress: boolean;
}

const createStubRule = ({
  ruleType,
  enabled,
  elasticRule,
  alertCount,
  caseCount,
  hasLegacyNotification,
  hasNotification,
  hasLegacyInvestigationField,
  hasAlertSuppressionPerExecution,
  hasAlertSuppressionPerPeriod,
  hasAlertSuppressionMissingFieldsStrategySuppress,
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
  has_legacy_investigation_field: hasLegacyInvestigationField,
  has_alert_suppression_per_execution: hasAlertSuppressionPerExecution,
  has_alert_suppression_per_period: hasAlertSuppressionPerPeriod,
  has_alert_suppression_missing_fields_strategy_suppress:
    hasAlertSuppressionMissingFieldsStrategySuppress,
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
        hasLegacyInvestigationField: false,
        hasAlertSuppressionPerExecution: false,
        hasAlertSuppressionPerPeriod: false,
        hasAlertSuppressionMissingFieldsStrategySuppress: false,
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
          legacy_investigation_fields: 0,
          suppression_enabled: 0,
          suppression_enabled_missing_fields_suppress: 0,
          suppression_enabled_per_rule_execution: 0,
          suppression_enabled_per_timeperiod: 0,
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
          legacy_investigation_fields: 0,
          suppression_enabled: 0,
          suppression_enabled_missing_fields_suppress: 0,
          suppression_enabled_per_rule_execution: 0,
          suppression_enabled_per_timeperiod: 0,
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
        hasLegacyInvestigationField: false,
        hasAlertSuppressionPerExecution: true,
        hasAlertSuppressionPerPeriod: false,
        hasAlertSuppressionMissingFieldsStrategySuppress: true,
      });
      const stubQueryRuleOne = createStubRule({
        ruleType: 'query',
        enabled: true,
        elasticRule: true,
        alertCount: 5,
        caseCount: 2,
        hasLegacyNotification: false,
        hasNotification: false,
        hasLegacyInvestigationField: true,
        hasAlertSuppressionPerExecution: false,
        hasAlertSuppressionPerPeriod: true,
        hasAlertSuppressionMissingFieldsStrategySuppress: false,
      });
      const stubQueryRuleTwo = createStubRule({
        ruleType: 'query',
        enabled: true,
        elasticRule: false,
        alertCount: 5,
        caseCount: 2,
        hasLegacyNotification: false,
        hasNotification: false,
        hasLegacyInvestigationField: false,
        hasAlertSuppressionPerExecution: true,
        hasAlertSuppressionPerPeriod: false,
        hasAlertSuppressionMissingFieldsStrategySuppress: false,
      });
      const stubMachineLearningOne = createStubRule({
        ruleType: 'machine_learning',
        enabled: false,
        elasticRule: false,
        alertCount: 0,
        caseCount: 10,
        hasLegacyNotification: false,
        hasNotification: false,
        hasLegacyInvestigationField: false,
        hasAlertSuppressionPerExecution: false,
        hasAlertSuppressionPerPeriod: false,
        hasAlertSuppressionMissingFieldsStrategySuppress: false,
      });
      const stubMachineLearningTwo = createStubRule({
        ruleType: 'machine_learning',
        enabled: true,
        elasticRule: true,
        alertCount: 22,
        caseCount: 44,
        hasLegacyNotification: false,
        hasNotification: false,
        hasLegacyInvestigationField: false,
        hasAlertSuppressionPerExecution: false,
        hasAlertSuppressionPerPeriod: false,
        hasAlertSuppressionMissingFieldsStrategySuppress: false,
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
          legacy_investigation_fields: 0,
          suppression_enabled: 2,
          suppression_enabled_missing_fields_suppress: 1,
          suppression_enabled_per_rule_execution: 1,
          suppression_enabled_per_timeperiod: 1,
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
          legacy_investigation_fields: 1,
          suppression_enabled: 0,
          suppression_enabled_missing_fields_suppress: 0,
          suppression_enabled_per_rule_execution: 0,
          suppression_enabled_per_timeperiod: 0,
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
          legacy_investigation_fields: 0,
          suppression_enabled: 1,
          suppression_enabled_missing_fields_suppress: 1,
          suppression_enabled_per_rule_execution: 0,
          suppression_enabled_per_timeperiod: 1,
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
          legacy_investigation_fields: 0,
          suppression_enabled: 0,
          suppression_enabled_missing_fields_suppress: 0,
          suppression_enabled_per_rule_execution: 0,
          suppression_enabled_per_timeperiod: 0,
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
          legacy_investigation_fields: 1,
          suppression_enabled: 1,
          suppression_enabled_missing_fields_suppress: 0,
          suppression_enabled_per_rule_execution: 1,
          suppression_enabled_per_timeperiod: 0,
        },
      });
    });

    describe('table tests of "ruleType", "enabled", "elasticRule", "legacyNotification", and "hasLegacyInvestigationField"', () => {
      test.each`
        ruleType              | enabled  | hasLegacyNotification | hasNotification | expectedLegacyNotificationsEnabled | expectedLegacyNotificationsDisabled | expectedNotificationsEnabled | expectedNotificationsDisabled | hasLegacyInvestigationField | hasAlertSuppressionPerExecution | hasAlertSuppressionPerPeriod | hasAlertSuppressionMissingFieldsStrategySuppress
        ${'eql'}              | ${true}  | ${true}               | ${false}        | ${1}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'eql'}              | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${false}                        | ${true}                      | ${false}
        ${'eql'}              | ${false} | ${false}              | ${true}         | ${0}                               | ${0}                                | ${0}                         | ${1}                          | ${0}                        | ${false}                        | ${true}                      | ${true}
        ${'eql'}              | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${true}                         | ${false}                     | ${false}
        ${'eql'}              | ${false} | ${true}               | ${false}        | ${0}                               | ${1}                                | ${0}                         | ${0}                          | ${0}                        | ${true}                         | ${false}                     | ${true}
        ${'eql'}              | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'eql'}              | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${1}                        | ${false}                        | ${false}                     | ${false}
        ${'query'}            | ${true}  | ${true}               | ${false}        | ${1}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'query'}            | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${true}                         | ${false}                     | ${false}
        ${'query'}            | ${false} | ${false}              | ${true}         | ${0}                               | ${0}                                | ${0}                         | ${1}                          | ${0}                        | ${true}                         | ${false}                     | ${true}
        ${'query'}            | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${false}                        | ${true}                      | ${false}
        ${'query'}            | ${false} | ${true}               | ${false}        | ${0}                               | ${1}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${true}                      | ${true}
        ${'query'}            | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'query'}            | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${1}                        | ${false}                        | ${false}                     | ${false}
        ${'threshold'}        | ${true}  | ${true}               | ${false}        | ${1}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'threshold'}        | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${true}                         | ${false}                     | ${false}
        ${'threshold'}        | ${false} | ${false}              | ${true}         | ${0}                               | ${0}                                | ${0}                         | ${1}                          | ${0}                        | ${true}                         | ${false}                     | ${true}
        ${'threshold'}        | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${false}                        | ${true}                      | ${false}
        ${'threshold'}        | ${false} | ${true}               | ${false}        | ${0}                               | ${1}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${true}                      | ${true}
        ${'threshold'}        | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'threshold'}        | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${1}                        | ${false}                        | ${false}                     | ${false}
        ${'machine_learning'} | ${true}  | ${true}               | ${false}        | ${1}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'machine_learning'} | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'machine_learning'} | ${false} | ${false}              | ${true}         | ${0}                               | ${0}                                | ${0}                         | ${1}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'machine_learning'} | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'machine_learning'} | ${false} | ${true}               | ${false}        | ${0}                               | ${1}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'machine_learning'} | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'machine_learning'} | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${1}                        | ${false}                        | ${false}                     | ${false}
        ${'threat_match'}     | ${true}  | ${true}               | ${false}        | ${1}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'threat_match'}     | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${true}                         | ${false}                     | ${false}
        ${'threat_match'}     | ${false} | ${false}              | ${true}         | ${0}                               | ${0}                                | ${0}                         | ${1}                          | ${0}                        | ${true}                         | ${false}                     | ${true}
        ${'threat_match'}     | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${false}                        | ${true}                      | ${false}
        ${'threat_match'}     | ${false} | ${true}               | ${false}        | ${0}                               | ${1}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${true}                      | ${true}
        ${'threat_match'}     | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'threat_match'}     | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${1}                        | ${false}                        | ${false}                     | ${false}
        ${'new_terms'}        | ${true}  | ${true}               | ${false}        | ${1}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'new_terms'}        | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${true}                         | ${false}                     | ${false}
        ${'new_terms'}        | ${false} | ${false}              | ${true}         | ${0}                               | ${0}                                | ${0}                         | ${1}                          | ${0}                        | ${true}                         | ${false}                     | ${true}
        ${'new_terms'}        | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${false}                        | ${true}                      | ${false}
        ${'new_terms'}        | ${false} | ${true}               | ${false}        | ${0}                               | ${1}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${true}                      | ${true}
        ${'new_terms'}        | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'new_terms'}        | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${1}                        | ${false}                        | ${false}                     | ${false}
        ${'esql'}             | ${true}  | ${true}               | ${false}        | ${1}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'esql'}             | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'esql'}             | ${false} | ${false}              | ${true}         | ${0}                               | ${0}                                | ${0}                         | ${1}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'esql'}             | ${true}  | ${false}              | ${true}         | ${0}                               | ${0}                                | ${1}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'esql'}             | ${false} | ${true}               | ${false}        | ${0}                               | ${1}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'esql'}             | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${0}                        | ${false}                        | ${false}                     | ${false}
        ${'esql'}             | ${false} | ${false}              | ${false}        | ${0}                               | ${0}                                | ${0}                         | ${0}                          | ${1}                        | ${false}                        | ${false}                     | ${false}
      `(
        'expect { "ruleType": $ruleType, "enabled": $enabled, "hasLegacyNotification": $hasLegacyNotification, "hasNotification": $hasNotification, hasLegacyInvestigationField: $hasLegacyInvestigationField } to equal { legacy_notifications_enabled: $expectedLegacyNotificationsEnabled, legacy_notifications_disabled: $expectedLegacyNotificationsDisabled, notifications_enabled: $expectedNotificationsEnabled, notifications_disabled, $expectedNotificationsDisabled, hasLegacyInvestigationField: $hasLegacyInvestigationField hasAlertSuppressionPerExecution: $hasAlertSuppressionPerExecution, hasAlertSuppressionPerPeriod: $hasAlertSuppressionPerPeriod, hasAlertSuppressionMissingFieldsStrategySuppress: $hasAlertSuppressionMissingFieldsStrategySuppress }',
        ({
          ruleType,
          enabled,
          hasLegacyNotification,
          hasNotification,
          expectedLegacyNotificationsEnabled,
          expectedLegacyNotificationsDisabled,
          expectedNotificationsEnabled,
          expectedNotificationsDisabled,
          hasLegacyInvestigationField,
          hasAlertSuppressionPerExecution,
          hasAlertSuppressionPerPeriod,
          hasAlertSuppressionMissingFieldsStrategySuppress,
        }) => {
          const rule1 = createStubRule({
            ruleType,
            enabled,
            elasticRule: false,
            hasLegacyNotification,
            hasNotification,
            alertCount: 0,
            caseCount: 0,
            hasLegacyInvestigationField,
            hasAlertSuppressionPerExecution,
            hasAlertSuppressionPerPeriod,
            hasAlertSuppressionMissingFieldsStrategySuppress,
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
              legacy_investigation_fields: hasLegacyInvestigationField ? 1 : 0,
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
            hasLegacyInvestigationField,
            hasAlertSuppressionPerExecution,
            hasAlertSuppressionPerPeriod,
            hasAlertSuppressionMissingFieldsStrategySuppress,
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
              legacy_investigation_fields: hasLegacyInvestigationField
                ? hasLegacyInvestigationField + 1
                : 0,
            })
          );
        }
      );
    });
  });
});
