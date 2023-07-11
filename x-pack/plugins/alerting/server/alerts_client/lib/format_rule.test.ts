/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatRule } from './format_rule';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { RecoveredActionGroup } from '../../types';

const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: 'test.rule-type',
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
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
        },
        ruleType,
      })
    ).toEqual({
      kibana: {
        alert: {
          rule: {
            category: 'My test rule',
            consumer: 'bar',
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            name: 'rule-name',
            parameters: {
              bar: true,
            },
            producer: 'alerts',
            revision: 0,
            rule_type_id: 'test.rule-type',
            tags: ['rule-', '-tags'],
            uuid: '1',
          },
        },
        space_ids: ['default'],
      },
    });
  });
});
