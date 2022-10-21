/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
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
      relatedIntegrations: [],
      requiredFields: [],
      riskScore: 42,
      riskScoreMapping: [],
      severity: 'low',
      severityMapping: [],
      setup: 'Some setup guide.',
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
    scheduledTaskId: undefined,
    executionStatus: {
      lastExecutionDate: new Date(2021, 0),
      status: 'ok',
    },
  });

  beforeAll(() => {
    (uuid.v4 as jest.Mock).mockReturnValue('new ruleId');
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('returns an object with fields copied from a given rule', () => {
    const rule = createTestRule();
    const result = duplicateRule(rule);

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
      throttle: null, // TODO: fix?
      notifyWhen: null, // TODO: fix?
      enabled: false, // covered in a separate test
    });
  });

  it('appends [Duplicate] to the name', () => {
    const rule = createTestRule();
    rule.name = 'PowerShell Keylogging Script';
    const result = duplicateRule(rule);

    expect(result).toEqual(
      expect.objectContaining({
        name: 'PowerShell Keylogging Script [Duplicate]',
      })
    );
  });

  it('generates a new ruleId', () => {
    const rule = createTestRule();
    const result = duplicateRule(rule);

    expect(result).toEqual(
      expect.objectContaining({
        params: expect.objectContaining({
          ruleId: 'new ruleId',
        }),
      })
    );
  });

  it('makes sure the duplicated rule is disabled', () => {
    const rule = createTestRule();
    rule.enabled = true;
    const result = duplicateRule(rule);

    expect(result).toEqual(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  describe('when duplicating a prebuilt (immutable) rule', () => {
    const createPrebuiltRule = () => {
      const rule = createTestRule();
      rule.params.immutable = true;
      return rule;
    };

    it('transforms it to a custom (mutable) rule', () => {
      const rule = createPrebuiltRule();
      const result = duplicateRule(rule);

      expect(result).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            immutable: false,
          }),
        })
      );
    });

    it('resets related integrations to an empty array', () => {
      const rule = createPrebuiltRule();
      rule.params.relatedIntegrations = [
        {
          package: 'aws',
          version: '~1.2.3',
          integration: 'route53',
        },
      ];

      const result = duplicateRule(rule);

      expect(result).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            relatedIntegrations: [],
          }),
        })
      );
    });

    it('resets required fields to an empty array', () => {
      const rule = createPrebuiltRule();
      rule.params.requiredFields = [
        {
          name: 'event.action',
          type: 'keyword',
          ecs: true,
        },
      ];

      const result = duplicateRule(rule);

      expect(result).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            requiredFields: [],
          }),
        })
      );
    });

    it('resets setup guide to an empty string', () => {
      const rule = createPrebuiltRule();
      rule.params.setup = `## Config\n\nThe 'Audit Detailed File Share' audit policy must be configured...`;
      const result = duplicateRule(rule);

      expect(result).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            setup: '',
          }),
        })
      );
    });
  });

  describe('when duplicating a custom (mutable) rule', () => {
    const createCustomRule = () => {
      const rule = createTestRule();
      rule.params.immutable = false;
      return rule;
    };

    it('keeps it custom', () => {
      const rule = createCustomRule();
      const result = duplicateRule(rule);

      expect(result).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            immutable: false,
          }),
        })
      );
    });

    it('copies related integrations as is', () => {
      const rule = createCustomRule();
      rule.params.relatedIntegrations = [
        {
          package: 'aws',
          version: '~1.2.3',
          integration: 'route53',
        },
      ];

      const result = duplicateRule(rule);

      expect(result).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            relatedIntegrations: rule.params.relatedIntegrations,
          }),
        })
      );
    });

    it('copies required fields as is', () => {
      const rule = createCustomRule();
      rule.params.requiredFields = [
        {
          name: 'event.action',
          type: 'keyword',
          ecs: true,
        },
      ];

      const result = duplicateRule(rule);

      expect(result).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            requiredFields: rule.params.requiredFields,
          }),
        })
      );
    });

    it('copies setup guide as is', () => {
      const rule = createCustomRule();
      rule.params.setup = `## Config\n\nThe 'Audit Detailed File Share' audit policy must be configured...`;
      const result = duplicateRule(rule);

      expect(result).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            setup: rule.params.setup,
          }),
        })
      );
    });
  });
});
