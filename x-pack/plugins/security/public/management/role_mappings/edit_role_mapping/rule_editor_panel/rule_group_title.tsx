/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiLink,
  EuiPopover,
} from '@elastic/eui';
import React, { useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import type { RuleGroup } from '../../model';
import { AllRule, AnyRule, ExceptAllRule, ExceptAnyRule, FieldRule } from '../../model';

interface Props {
  rule: RuleGroup;
  readonly?: boolean;
  parentRule?: RuleGroup;
  onChange: (rule: RuleGroup) => void;
}

const rules = [new AllRule(), new AnyRule()];
const exceptRules = [new ExceptAllRule(), new ExceptAnyRule()];

export const RuleGroupTitle = (props: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [showConfirmChangeModal, setShowConfirmChangeModal] = useState(false);
  const [pendingNewRule, setPendingNewRule] = useState<RuleGroup | null>(null);

  const canUseExcept = props.parentRule && props.parentRule.canContainRules(exceptRules);

  const availableRuleTypes = [...rules, ...(canUseExcept ? exceptRules : [])];

  const onChange = (newRule: RuleGroup) => {
    const currentSubRules = props.rule.getRules();
    const areSubRulesValid = newRule.canContainRules(currentSubRules);
    if (areSubRulesValid) {
      const clone = newRule.clone() as RuleGroup;
      currentSubRules.forEach((subRule) => clone.addRule(subRule));

      props.onChange(clone);
      setIsMenuOpen(false);
    } else {
      setPendingNewRule(newRule);
      setShowConfirmChangeModal(true);
    }
  };

  const changeRuleDiscardingSubRules = (newRule: RuleGroup) => {
    // Ensure a default sub rule is present when not carrying over the original sub rules
    const newRuleInstance = newRule.clone() as RuleGroup;
    if (newRuleInstance.getRules().length === 0) {
      newRuleInstance.addRule(new FieldRule('username', '*'));
    }

    props.onChange(newRuleInstance);
    setIsMenuOpen(false);
  };

  const ruleButton = (
    <EuiLink onClick={() => setIsMenuOpen(!isMenuOpen)} data-test-subj="ruleGroupTitle">
      {props.rule.getDisplayTitle()} <EuiIcon type="arrowDown" />
    </EuiLink>
  );

  const ruleTypeSelector = (
    <EuiPopover button={ruleButton} isOpen={isMenuOpen} closePopover={() => setIsMenuOpen(false)}>
      <EuiContextMenuPanel
        items={availableRuleTypes.map((rt, index) => {
          const isSelected = rt.getDisplayTitle() === props.rule.getDisplayTitle();
          const icon = isSelected ? 'check' : 'empty';
          return (
            <EuiContextMenuItem key={index} icon={icon} onClick={() => onChange(rt as RuleGroup)}>
              {rt.getDisplayTitle()}
            </EuiContextMenuItem>
          );
        })}
      />
    </EuiPopover>
  );

  const confirmChangeModal = showConfirmChangeModal ? (
    <EuiConfirmModal
      data-test-subj="confirmRuleChangeModal"
      title={
        <FormattedMessage
          id="xpack.security.management.editRoleMapping.confirmGroupChangePromptTitle"
          defaultMessage="Change group type?"
        />
      }
      onCancel={() => {
        setShowConfirmChangeModal(false);
        setPendingNewRule(null);
      }}
      onConfirm={() => {
        setShowConfirmChangeModal(false);
        changeRuleDiscardingSubRules(pendingNewRule!);
        setPendingNewRule(null);
      }}
      cancelButtonText={
        <FormattedMessage
          id="xpack.security.management.editRoleMapping.confirmGroupChangeCancelButton"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.security.management.editRoleMapping.confirmGroupChangeConfirmButton"
          defaultMessage="Change anyway"
        />
      }
    >
      <p>
        <FormattedMessage
          id="xpack.security.management.editRoleMapping.switchWithIncompatibleRulesMessage"
          defaultMessage="This group contains rules that are not compatible with the new type. If you change types, you will lose all rules within this group."
        />
      </p>
    </EuiConfirmModal>
  ) : null;

  return (
    <h3>
      {ruleTypeSelector}
      {confirmChangeModal}
    </h3>
  );
};
