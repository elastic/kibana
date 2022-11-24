/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { Capabilities } from '@kbn/core-capabilities-common';
import { Rule, RuleAction, RuleType, RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { RecursiveReadonly } from '@kbn/utility-types';

import { useIsRuleEditable, UseIsRuleEditableProps } from './use_is_rule_editable';
import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';

const mockConsumer = 'mock-consumerId';
const mockRuleTypeId = 'mock-ruleTypeId';

const ruleTypeRegistry = new TypeRegistry<RuleTypeModel>();
ruleTypeRegistry.register({
  id: mockRuleTypeId,
  requiresAppContext: false,
  actions: [],
} as unknown as RuleTypeModel);

const renderUseIsRuleEditableHook = (props: UseIsRuleEditableProps) => {
  return renderHook(() => useIsRuleEditable({ ...props }));
};

const capabilities = {
  actions: {
    execute: true,
  },
} as unknown as RecursiveReadonly<Capabilities>;

const rule = {
  consumer: mockConsumer,
  actions: [],
  ruleTypeId: mockRuleTypeId,
} as unknown as Rule;

const ruleType = {
  authorizedConsumers: {
    [mockConsumer]: {
      all: true,
    },
  },
} as unknown as RuleType;

describe('useIsRuleEditable', () => {
  it('should return false if there is no rule', () => {
    const {
      result: { current: isRuleEditable },
    } = renderUseIsRuleEditableHook({
      capabilities,
      rule: undefined,
      ruleType,
      ruleTypeRegistry,
    });

    expect(isRuleEditable).toBe(false);
  });

  it('should return false if the authorized consumers object of the rule type does not contain the particular rule being passed', () => {
    const {
      result: { current: isRuleEditable },
    } = renderUseIsRuleEditableHook({
      capabilities,
      rule,
      ruleType: {
        authorizedConsumers: {},
      } as unknown as RuleType,
      ruleTypeRegistry,
    });
    expect(isRuleEditable).toBe(false);
  });

  it('should return false if the authorized consumers object of the rule type has the id for the particular rule, but all is not set to true', () => {
    const {
      result: { current: isRuleEditable },
    } = renderUseIsRuleEditableHook({
      capabilities,
      rule,
      ruleType: {
        authorizedConsumers: {
          [mockConsumer]: {
            all: false,
          },
        },
      } as unknown as RuleType,
      ruleTypeRegistry,
    });
    expect(isRuleEditable).toBe(false);
  });

  it('should return false if the rule has actions to perform but the execute capability is false ', () => {
    const {
      result: { current: isRuleEditable },
    } = renderUseIsRuleEditableHook({
      capabilities: {
        actions: {
          execute: false,
        },
      } as unknown as RecursiveReadonly<Capabilities>,
      rule: {
        ...rule,
        actions: ['123'] as unknown as RuleAction[],
      },
      ruleType,
      ruleTypeRegistry,
    });
    expect(isRuleEditable).toBe(false);
  });

  it('should return false if the rule is not registered in the rule registry', () => {
    const {
      result: { current: isRuleEditable },
    } = renderUseIsRuleEditableHook({
      capabilities,
      rule,
      ruleType,
      ruleTypeRegistry: new TypeRegistry<RuleTypeModel>(),
    });
    expect(isRuleEditable).toBe(false);
  });

  it('it should return true if all conditions are met', () => {
    const {
      result: { current: isRuleEditable },
    } = renderUseIsRuleEditableHook({
      capabilities,
      rule,
      ruleType,
      ruleTypeRegistry,
    });
    expect(isRuleEditable).toBe(true);
  });
});
