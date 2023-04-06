/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
  producer: 'alerts',
  cancelAlertsOnRuleTimeout: true,
  ruleTaskTimeout: '5m',
  getSummarizedAlerts: jest.fn(),
};

const context = {
  ruleTypeRegistry: {
    get: () => ruleType,
  },
} as unknown as RulesClientContext;

const ruleId = 'rule_id_1';

const attributes = {
  alertTypeId: 'siem.query',
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
  it('should call retrieveMigratedLegacyActions with correct rule if', async () => {
    (retrieveMigratedLegacyActions as jest.Mock).mockResolvedValue({
      legacyActions: [],
      legacyActionsReferences: [],
    });
    await migrateLegacyActions(context, { ruleId });

    expect(retrieveMigratedLegacyActions).toHaveBeenCalledWith(context, { ruleId });
  });

  it('should not call validateActions and injectReferencesIntoActions if attributes not provided', async () => {
    await migrateLegacyActions(context, { ruleId });

    expect(validateActions).not.toHaveBeenCalled();
    expect(injectReferencesIntoActions).not.toHaveBeenCalled();
  });

  it('should call validateActions and injectReferencesIntoActions if attributes provided', async () => {
    (retrieveMigratedLegacyActions as jest.Mock).mockResolvedValueOnce({
      legacyActions: legacyActionsMock,
      legacyActionsReferences: legacyReferencesMock,
    });

    (injectReferencesIntoActions as jest.Mock).mockReturnValue('actions-with-references');
    await migrateLegacyActions(context, { ruleId, attributes });

    expect(validateActions).toHaveBeenCalledWith(context, ruleType, {
      ...attributes,
      actions: 'actions-with-references',
    });

    expect(injectReferencesIntoActions).toHaveBeenCalledWith(
      'rule_id_1',
      [
        {
          actionRef: 'action_0',
          actionTypeId: '.email',
          group: 'default',
          params: {
            message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            subject: 'Test Actions',
            to: ['test@test.com'],
          },
          uuid: '11403909-ca9b-49ba-9d7a-7e5320e68d05',
        },
      ],
      [{ id: 'cc85da20-d480-11ed-8e69-1df522116c28', name: 'action_0', type: 'action' }]
    );
  });

  it('should return correct response when legacy actions empty and existing empty', async () => {
    const result = await migrateLegacyActions(context, {
      ruleId,
      actions: existingActionsMock,
      references: referencesMock,
    });

    expect(result).toHaveProperty('hasLegacyActions', false);
    expect(result).toHaveProperty('references', referencesMock);
    expect(result).toHaveProperty('actions', existingActionsMock);
  });

  it('should return correct response when legacy actions empty and existing actions empty', async () => {
    const result = await migrateLegacyActions(context, {
      ruleId,
    });

    expect(result).toHaveProperty('hasLegacyActions', false);
    expect(result).toHaveProperty('references', []);
    expect(result).toHaveProperty('actions', []);
  });
  it('should return correct response when existing actions empty and legacy present', async () => {
    (retrieveMigratedLegacyActions as jest.Mock).mockResolvedValueOnce({
      legacyActions: legacyActionsMock,
      legacyActionsReferences: legacyReferencesMock,
    });

    const result = await migrateLegacyActions(context, {
      ruleId,
    });

    expect(result).toHaveProperty('hasLegacyActions', true);
    expect(result).toHaveProperty('references', legacyReferencesMock);
    expect(result).toHaveProperty('actions', legacyActionsMock);
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
    });

    expect(result.references[0].name).toBe('action_0');
    expect(result.references[1].name).toBe('action_1');

    expect(result).toHaveProperty('hasLegacyActions', true);

    // ensure references are correct
    expect(result.references[0].name).toBe('action_0');
    expect(result.references[1].name).toBe('action_1');
    expect(result).toHaveProperty('references', [
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
    expect(result.actions[0].actionRef).toBe('action_0');
    expect(result.actions[1].actionRef).toBe('action_1');
    expect(result).toHaveProperty('actions', [
      {
        actionRef: 'action_0',
        actionTypeId: '.webhook',
        group: 'default',
        params: { body: { test_web_hook: 'alert.id - {{alert.id}}' } },
        uuid: '6e253775-693c-4dcb-a4f5-ad37d9524ecf',
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
