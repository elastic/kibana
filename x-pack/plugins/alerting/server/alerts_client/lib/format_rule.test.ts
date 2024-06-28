/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatRule } from './format_rule';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { RecoveredActionGroup } from '../../types';
import {
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REVISION,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  SPACE_IDS,
} from '@kbn/rule-data-utils';

const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: 'test.rule-type',
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  category: 'test',
  producer: 'alerts',
  cancelAlertsOnRuleTimeout: true,
  ruleTaskTimeout: '5m',
  autoRecoverAlerts: true,
  validate: {
    params: { validate: (params) => params },
  },
  alerts: {
    context: 'test',
    mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    shouldWrite: true,
  },
  validLegacyConsumers: [],
};

describe('formatRule', () => {
  test('should format rule data', () => {
    expect(
      formatRule({
        rule: {
          consumer: 'bar',
          executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
          id: '1',
          name: 'rule-name',
          parameters: {
            bar: true,
          },
          revision: 0,
          spaceId: 'default',
          tags: ['rule-', '-tags'],
          alertDelay: 0,
        },
        ruleType,
      })
    ).toEqual({
      [ALERT_RULE_CATEGORY]: 'My test rule',
      [ALERT_RULE_CONSUMER]: 'bar',
      [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
      [ALERT_RULE_NAME]: 'rule-name',
      [ALERT_RULE_PARAMETERS]: { bar: true },
      [ALERT_RULE_PRODUCER]: 'alerts',
      [ALERT_RULE_REVISION]: 0,
      [ALERT_RULE_TYPE_ID]: 'test.rule-type',
      [ALERT_RULE_TAGS]: ['rule-', '-tags'],
      [ALERT_RULE_UUID]: '1',
      [SPACE_IDS]: ['default'],
    });
  });
});
