/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertConsumers } from '@kbn/rule-data-utils';

import type { SavedObjectReference } from '@kbn/core/server';

import { migrateLegacyActions } from './migrate_legacy_actions';
import { retrieveMigratedLegacyActions } from './retrieve_migrated_legacy_actions';
import { injectReferencesIntoActions } from '../../common';

import { validateActions } from '../validate_actions';
import { RulesClientContext } from '../..';
import { RawRuleAction, RawRule } from '../../../types';

import { UntypedNormalizedRuleType } from '../../../rule_type_registry';
import { RecoveredActionGroup } from '../../../../common';

jest.mock('./retrieve_migrated_legacy_actions', () => ({
  retrieveMigratedLegacyActions: jest.fn(),
}));

jest.mock('../validate_actions', () => ({
  validateActions: jest.fn(),
}));

jest.mock('../../common', () => ({
  injectReferencesIntoActions: jest.fn(),
}));

const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: 'test',
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
  validate: {
    params: { validate: (params) => params },
  },
  validLegacyConsumers: [],
};

const context = {
  ruleTypeRegistry: {
    get: () => ruleType,
  },
  logger: {
    error: jest.fn(),
  },
} as unknown as RulesClientContext;

const ruleId = 'rule_id_1';

const attributes = {
  alertTypeId: 'siem.query',
  consumer: AlertConsumers.SIEM,
} as unknown as RawRule;

(retrieveMigratedLegacyActions as jest.Mock).mockResolvedValue({
  legacyActions: [],
  legacyActionsReferences: [],
});

const legacyActionsMock: RawRuleAction[] = [
  {
    group: 'default',
    params: {
      message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
      to: ['test@test.com'],
      subject: 'Test Actions',
    },
    actionTypeId: '.email',
    uuid: '11403909-ca9b-49ba-9d7a-7e5320e68d05',
    actionRef: 'action_0',
    frequency: {
      notifyWhen: 'onThrottleInterval',
      summary: true,
      throttle: '1d',
    },
  },
];

const legacyReferencesMock: SavedObjectReference[] = [
  {
    id: 'cc85da20-d480-11ed-8e69-1df522116c28',
    name: 'action_0',
    type: 'action',
  },
];

const existingActionsMock: RawRuleAction[] = [
  {
    group: 'default',
    params: {
      body: {
        test_web_hook: 'alert.id - {{alert.id}}',
      },
    },
    actionTypeId: '.webhook',
    uuid: '6e253775-693c-4dcb-a4f5-ad37d9524ecf',
    actionRef: 'action_0',
  },
];

const referencesMock: SavedObjectReference[] = [
  {
    id: 'b2fd3f90-cd81-11ed-9f6d-a746729ca213',
    name: 'action_0',
    type: 'action',
  },
];

describe('migrateLegacyActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an exception when error is thrown within method', async () => {
    (retrieveMigratedLegacyActions as jest.Mock).mockRejectedValueOnce(new Error('test failure'));
    await expect(
      migrateLegacyActions(context, {
        ruleId,
        attributes,
      })
    ).rejects.toThrowError(
      `Failed to migrate legacy actions for SIEM rule ${ruleId}: test failure`
    );

    expect(context.logger.error).toHaveBeenCalledWith(
      `migrateLegacyActions(): Failed to migrate legacy actions for SIEM rule ${ruleId}: test failure`
    );
  });

  it('should return earley empty migratedActions when consumer is not SIEM', async () => {
    (retrieveMigratedLegacyActions as jest.Mock).mockResolvedValue({
      legacyActions: [],
      legacyActionsReferences: [],
    });
    const migratedActions = await migrateLegacyActions(context, {
      ruleId,
      attributes: { ...attributes, consumer: 'mine' },
    });

    expect(migratedActions).toEqual({
      resultedActions: [],
      hasLegacyActions: false,
      resultedReferences: [],
    });
    expect(retrieveMigratedLegacyActions).not.toHaveBeenCalled();
    expect(validateActions).not.toHaveBeenCalled();
    expect(injectReferencesIntoActions).not.toHaveBeenCalled();
  });

  it('should call retrieveMigratedLegacyActions with correct rule id', async () => {
    (retrieveMigratedLegacyActions as jest.Mock).mockResolvedValue({
      legacyActions: [],
      legacyActionsReferences: [],
    });
    await migrateLegacyActions(context, { ruleId, attributes });

    expect(retrieveMigratedLegacyActions).toHaveBeenCalledWith(
      context,
      { ruleId },
      expect.any(Function)
    );
  });

  it('should not call validateActions and injectReferencesIntoActions if skipActionsValidation=true', async () => {
    await migrateLegacyActions(context, { ruleId, attributes, skipActionsValidation: true });

    expect(validateActions).not.toHaveBeenCalled();
    expect(injectReferencesIntoActions).not.toHaveBeenCalled();
  });

  it('should set frequency props from rule level to existing actions', async () => {
    const result = await migrateLegacyActions(context, {
      ruleId,
      actions: existingActionsMock,
      references: referencesMock,
      attributes: { ...attributes, throttle: '1h', notifyWhen: 'onThrottleInterval' },
    });

    expect(result).toHaveProperty('hasLegacyActions', false);
    expect(result).toHaveProperty('resultedReferences', referencesMock);
    expect(result).toHaveProperty('resultedActions', [
      {
        actionRef: 'action_0',
        actionTypeId: '.webhook',
        group: 'default',
        params: { body: { test_web_hook: 'alert.id - {{alert.id}}' } },
        uuid: '6e253775-693c-4dcb-a4f5-ad37d9524ecf',
        frequency: {
          notifyWhen: 'onThrottleInterval',
          summary: true,
          throttle: '1h',
        },
      },
    ]);
  });

  it('should return correct response when legacy actions empty and existing empty', async () => {
    const result = await migrateLegacyActions(context, {
      ruleId,
      actions: existingActionsMock,
      references: referencesMock,
      attributes,
    });

    expect(result).toHaveProperty('hasLegacyActions', false);
    expect(result).toHaveProperty('resultedReferences', referencesMock);
    expect(result).toHaveProperty('resultedActions', [
      {
        actionRef: 'action_0',
        actionTypeId: '.webhook',
        group: 'default',
        params: { body: { test_web_hook: 'alert.id - {{alert.id}}' } },
        uuid: '6e253775-693c-4dcb-a4f5-ad37d9524ecf',
        frequency: {
          notifyWhen: 'onActiveAlert',
          summary: true,
          throttle: null,
        },
      },
    ]);
  });

  it('should return correct response when legacy actions empty and existing actions empty', async () => {
    const result = await migrateLegacyActions(context, {
      ruleId,
      attributes,
    });

    expect(result).toHaveProperty('hasLegacyActions', false);
    expect(result).toHaveProperty('resultedReferences', []);
    expect(result).toHaveProperty('resultedActions', []);
  });
  it('should return correct response when existing actions empty and legacy present', async () => {
    (retrieveMigratedLegacyActions as jest.Mock).mockResolvedValueOnce({
      legacyActions: legacyActionsMock,
      legacyActionsReferences: legacyReferencesMock,
    });

    const result = await migrateLegacyActions(context, {
      ruleId,
      attributes,
    });

    expect(result).toHaveProperty('hasLegacyActions', true);
    expect(result).toHaveProperty('resultedReferences', legacyReferencesMock);
    expect(result).toHaveProperty('resultedActions', legacyActionsMock);
  });
  it('should merge actions and references correctly when existing and legacy actions both present', async () => {
    (retrieveMigratedLegacyActions as jest.Mock).mockResolvedValueOnce({
      legacyActions: legacyActionsMock,
      legacyActionsReferences: legacyReferencesMock,
    });

    const result = await migrateLegacyActions(context, {
      ruleId,
      actions: existingActionsMock,
      references: referencesMock,
      attributes,
    });

    expect(result.resultedReferences[0].name).toBe('action_0');
    expect(result.resultedReferences[1].name).toBe('action_1');

    expect(result).toHaveProperty('hasLegacyActions', true);

    // ensure references are correct
    expect(result.resultedReferences[0].name).toBe('action_0');
    expect(result.resultedReferences[1].name).toBe('action_1');
    expect(result).toHaveProperty('resultedReferences', [
      {
        id: 'b2fd3f90-cd81-11ed-9f6d-a746729ca213',
        name: 'action_0',
        type: 'action',
      },
      {
        id: 'cc85da20-d480-11ed-8e69-1df522116c28',
        name: 'action_1',
        type: 'action',
      },
    ]);

    // ensure actionsRefs are correct
    expect(result.resultedActions[0].actionRef).toBe('action_0');
    expect(result.resultedActions[1].actionRef).toBe('action_1');
    expect(result).toHaveProperty('resultedActions', [
      {
        actionRef: 'action_0',
        actionTypeId: '.webhook',
        group: 'default',
        params: { body: { test_web_hook: 'alert.id - {{alert.id}}' } },
        uuid: '6e253775-693c-4dcb-a4f5-ad37d9524ecf',
        frequency: {
          notifyWhen: 'onActiveAlert',
          summary: true,
          throttle: null,
        },
      },
      {
        actionRef: 'action_1',
        actionTypeId: '.email',
        frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1d' },
        group: 'default',
        params: {
          message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          subject: 'Test Actions',
          to: ['test@test.com'],
        },
        uuid: '11403909-ca9b-49ba-9d7a-7e5320e68d05',
      },
    ]);
  });
});
