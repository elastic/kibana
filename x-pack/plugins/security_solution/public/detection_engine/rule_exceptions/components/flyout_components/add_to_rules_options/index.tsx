/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiRadio, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Rule } from '../../../../rule_management/logic/types';
import { ExceptionsAddToRulesTable } from '../add_to_rules_table';

export type AddToRuleListsRadioOptions = 'select_rules_to_add_to' | 'add_to_rules' | 'add_to_rule';

interface ExceptionsAddToRulesOptionsComponentProps {
  possibleRules: Rule[] | null;
  selectedRadioOption: string;
  isSingleRule: boolean;
  isBulkAction: boolean;
  onRuleSelectionChange: (rulesSelectedToAdd: Rule[]) => void;
  onRadioChange: (option: AddToRuleListsRadioOptions) => void;
}

const ExceptionsAddToRulesOptionsComponent: React.FC<ExceptionsAddToRulesOptionsComponentProps> = ({
  possibleRules,
  isSingleRule,
  isBulkAction,
  selectedRadioOption,
  onRuleSelectionChange,
  onRadioChange,
}): JSX.Element => {
  const ruleRadioOptionProps = useMemo(() => {
    if (isBulkAction && possibleRules != null) {
      return {
        id: 'add_to_rules',
        label: (
          <EuiText data-test-subj="addToRulesRadioOption">
            <FormattedMessage
              defaultMessage="Add to [{numRules}] selected rules: {ruleNames}"
              id="xpack.securitySolution.exceptions.common.addToRulesOptionLabel"
              values={{
                numRules: possibleRules.length,
                ruleNames: (
                  <span style={{ fontWeight: 'bold' }}>
                    {possibleRules.map(({ name }) => name).join(',')}
                  </span>
                ),
              }}
            />
          </EuiText>
        ),
        checked: selectedRadioOption === 'add_to_rules',
        'data-test-subj': 'addToRulesOptionsRadio',
        onChange: () => {
          onRadioChange('add_to_rules');
          onRuleSelectionChange(possibleRules);
        },
      };
    }

    if (isSingleRule && possibleRules != null) {
      return {
        id: 'add_to_rule',
        label: (
          <EuiText data-test-subj="addToRuleRadioOption">
            <FormattedMessage
              defaultMessage="Add to this rule: {ruleName}"
              id="xpack.securitySolution.exceptions.common.addToRuleOptionLabel"
              values={{
                ruleName: <span style={{ fontWeight: 'bold' }}>{possibleRules[0].name}</span>,
              }}
            />
          </EuiText>
        ),
        checked: selectedRadioOption === 'add_to_rule',
        'data-test-subj': 'addToRuleOptionsRadio',
        onChange: () => {
          onRadioChange('add_to_rule');
          onRuleSelectionChange(possibleRules);
        },
      };
    }

    return {
      id: 'select_rules_to_add_to',
      label: (
        <EuiText data-test-subj="selectRulesToAddToRadioOption">
          <FormattedMessage
            defaultMessage="Add to rules"
            id="xpack.securitySolution.exceptions.common.selectRulesOptionLabel"
          />
        </EuiText>
      ),
      checked: selectedRadioOption === 'select_rules_to_add_to',
      'data-test-subj': 'selectRulesToAddToOptionRadio',
      onChange: () => onRadioChange('select_rules_to_add_to'),
    };
  }, [
    isBulkAction,
    possibleRules,
    isSingleRule,
    selectedRadioOption,
    onRadioChange,
    onRuleSelectionChange,
  ]);

  return (
    <>
      <EuiRadio {...ruleRadioOptionProps} />
      {selectedRadioOption === 'select_rules_to_add_to' && (
        <ExceptionsAddToRulesTable
          onRuleSelectionChange={onRuleSelectionChange}
          initiallySelectedRules={[]}
        />
      )}
    </>
  );
};

export const ExceptionsAddToRulesOptions = React.memo(ExceptionsAddToRulesOptionsComponent);

ExceptionsAddToRulesOptions.displayName = 'ExceptionsAddToRulesOptions';
