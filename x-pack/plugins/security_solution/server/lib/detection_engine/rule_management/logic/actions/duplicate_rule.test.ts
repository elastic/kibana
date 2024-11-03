/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';

import type { RuleParams } from '../../../rule_schema';
import { duplicateRule } from './duplicate_rule';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('duplicateRule', () => {
  const createTestRule = (): SanitizedRule<RuleParams> => ({
    id: 'some id',
    notifyWhen: 'onActiveAlert',
    name: 'Some rule',
    tags: ['some tag'],
    alertTypeId: 'siem.queryRule',
    consumer: 'siem',
    params: {
      savedId: undefined,
      author: [],
      description: 'Some description.',
      ruleId: 'some ruleId',
      falsePositives: [],
      from: 'now-360s',
      immutable: false,
      license: '',
      outputIndex: '.siem-signals-default',
      meta: undefined,
      maxSignals: 100,
      responseActions: [],
      relatedIntegrations: [
        {
          package: 'aws',
          version: '~1.2.3',
          integration: 'route53',
        },
      ],
      requiredFields: [
        {
          name: 'event.action',
          type: 'keyword',
          ecs: true,
        },
      ],
      riskScore: 42,
      riskScoreMapping: [],
      severity: 'low',
      severityMapping: [],
      setup: `## Config\n\nThe 'Audit Detailed File Share' audit policy must be configured...`,
      threat: [],
      to: 'now',
      references: [],
      version: 1,
      exceptionsList: [],
      type: 'query',
      language: 'kuery',
      index: [],
      query: 'process.args : "chmod"',
      filters: [],
      buildingBlockType: undefined,
      namespace: undefined,
      note: undefined,
      timelineId: undefined,
      timelineTitle: undefined,
      ruleNameOverride: undefined,
      timestampOverride: undefined,
      timestampOverrideFallbackDisabled: undefined,
      dataViewId: undefined,
      alertSuppression: undefined,
      investigationFields: undefined,
    },
    schedule: {
      interval: '5m',
    },
    enabled: false,
    actions: [],
    throttle: null,
    apiKeyOwner: 'kibana',
    createdBy: 'kibana',
    updatedBy: 'kibana',
    muteAll: false,
    mutedInstanceIds: [],
    updatedAt: new Date(2021, 0),
    createdAt: new Date(2021, 0),
    revision: 0,
    scheduledTaskId: undefined,
    executionStatus: {
      lastExecutionDate: new Date(2021, 0),
      status: 'ok',
    },
  });

  beforeAll(() => {
    (uuidv4 as jest.Mock).mockReturnValue('new ruleId');
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('when duplicating any kind of rule', () => {
    it('appends [Duplicate] to the name', async () => {
      const rule = createTestRule();
      rule.name = 'PowerShell Keylogging Script';
      const result = await duplicateRule({
        rule,
      });

      expect(result).toEqual(
        expect.objectContaining({
          name: 'PowerShell Keylogging Script [Duplicate]',
        })
      );
    });

    it('generates a new ruleId', async () => {
      const rule = createTestRule();
      const result = await duplicateRule({
        rule,
      });

      expect(result).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            ruleId: 'new ruleId',
          }),
        })
      );
    });

    it('makes sure the duplicated rule is disabled', async () => {
      const rule = createTestRule();
      rule.enabled = true;
      const result = await duplicateRule({
        rule,
      });

      expect(result).toEqual(
        expect.objectContaining({
          enabled: false,
        })
      );
    });
  });

  describe('when duplicating a prebuilt rule', () => {
    const createPrebuiltRule = () => {
      const rule = createTestRule();
      rule.params.immutable = true;
      rule.params.ruleSource = {
        type: 'external',
        isCustomized: false,
      };
      return rule;
    };

    it('transforms it to a custom rule', async () => {
      const rule = createPrebuiltRule();
      const result = await duplicateRule({
        rule,
      });

      expect(result).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            immutable: false,
            ruleSource: {
              type: 'internal',
            },
          }),
        })
      );
    });

    it('copies fields from the original rule', async () => {
      const rule = createPrebuiltRule();
      const result = await duplicateRule({
        rule,
      });

      expect(result).toEqual({
        name: expect.anything(), // covered in a separate test
        params: {
          ...rule.params,
          ruleId: expect.anything(), // covered in a separate test
          immutable: expect.anything(), // covered in a separate test
          ruleSource: expect.anything(), // covered in a separate test
        },
        tags: rule.tags,
        alertTypeId: rule.alertTypeId,
        consumer: rule.consumer,
        schedule: rule.schedule,
        actions: rule.actions,
        systemActions: rule.actions,
        enabled: false, // covered in a separate test
      });
    });
  });

  describe('when duplicating a custom rule', () => {
    const createCustomRule = () => {
      const rule = createTestRule();
      rule.params.immutable = false;
      rule.params.ruleSource = {
        type: 'internal',
      };
      return rule;
    };

    it('keeps it custom', async () => {
      const rule = createCustomRule();
      const result = await duplicateRule({
        rule,
      });

      expect(result).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            immutable: false,
            ruleSource: {
              type: 'internal',
            },
          }),
        })
      );
    });

    it('copies fields from the original rule', async () => {
      const rule = createCustomRule();
      const result = await duplicateRule({
        rule,
      });

      expect(result).toEqual({
        name: expect.anything(), // covered in a separate test
        params: {
          ...rule.params,
          ruleId: expect.anything(), // covered in a separate test
        },
        tags: rule.tags,
        alertTypeId: rule.alertTypeId,
        consumer: rule.consumer,
        schedule: rule.schedule,
        actions: rule.actions,
        systemActions: rule.actions,
        enabled: false, // covered in a separate test
      });
    });
  });
});
