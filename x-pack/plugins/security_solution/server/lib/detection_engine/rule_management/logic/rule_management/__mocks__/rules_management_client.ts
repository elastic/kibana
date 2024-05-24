/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRulesManagementClient,
  CreateRuleOptions,
  _UpdateRuleProps,
  _PatchRuleProps,
} from '../rules_management_client';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  RuleCreateProps,
  RuleObjectId,
} from '../../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../../prebuilt_rules';
import type { RuleAlertType } from '../../../../rule_schema';

export type RulesManagementClientMock = jest.Mocked<IRulesManagementClient>;

const createRulesManagementClientMock = () => {
  const mocked: RulesManagementClientMock = {
    createCustomRule: jest.fn(),
    createPrebuiltRule: jest.fn(),
    updateRule: jest.fn(),
    patchRule: jest.fn(),
    deleteRule: jest.fn(),
    upgradePrebuiltRule: jest.fn(),
    importRule: jest.fn(),
  };
  return mocked;
};

export const rulesManagementClientMock: {
  create: () => RulesManagementClientMock;
} = {
  create: createRulesManagementClientMock,
};

/* Mocks for internal methods */
export const _createRule: jest.Mock<
  (
    rulesClient: RulesClient,
    params: RuleCreateProps,
    options: CreateRuleOptions
  ) => Promise<RuleAlertType>
> = jest.fn();

export const _updateRule: jest.Mock<
  (rulesClient: RulesClient, updateRulePayload: _UpdateRuleProps) => Promise<RuleAlertType>
> = jest.fn();

export const patchRuleMock: jest.Mock<
  (rulesClient: RulesClient, patchRulePayload: _PatchRuleProps) => Promise<RuleAlertType>
> = jest.fn();

export const _upgradePrebuiltRuleWithTypeChange: jest.Mock<
  (
    rulesClient: RulesClient,
    ruleAsset: PrebuiltRuleAsset,
    existingRule: RuleAlertType
  ) => Promise<RuleAlertType>
> = jest.fn();

export const _toggleRuleEnabledOnUpdate: jest.Mock<
  (rulesClient: RulesClient, existingRule: RuleAlertType, enabled: boolean) => Promise<void>
> = jest.fn();

export const _deleteRule: jest.Mock<
  (rulesClient: RulesClient, deleteRulePayload: { ruleId: RuleObjectId }) => Promise<void>
> = jest.fn();
