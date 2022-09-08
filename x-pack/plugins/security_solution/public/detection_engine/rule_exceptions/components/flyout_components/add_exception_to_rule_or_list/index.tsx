/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiTitle, EuiSpacer, EuiPanel } from '@elastic/eui';
import styled, { css } from 'styled-components';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import * as i18n from './translations';
import type { Rule } from '../../../../../detections/containers/detection_engine/rules/types';
import { ExceptionsAddToRulesOptions } from '../add_to_rules_options';
import { ExceptionsAddToListsOptions } from '../add_to_lists_options';

export type AddToRuleListsRadioOptions = 'select_rules_to_add_to' | 'add_to_rules' | 'add_to_rule';

interface ExceptionsAddToRulesOrListsComponentProps {
  rules: Rule[] | null;
  selectedRadioOption: string;
  isBulkAction: boolean;
  onListSelectionChange: (lists: ExceptionListSchema[]) => void;
  onRuleSelectionChange: (rulesSelectedToAdd: Rule[]) => void;
  onRadioChange: (radioId: string) => void;
}

const SectionHeader = styled(EuiTitle)`
  ${() => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

const ExceptionsAddToRulesOrListsComponent: React.FC<ExceptionsAddToRulesOrListsComponentProps> = ({
  rules,
  isBulkAction,
  selectedRadioOption,
  onListSelectionChange,
  onRuleSelectionChange,
  onRadioChange,
}): JSX.Element => {
  const isSingleRule = useMemo(() => rules != null && rules.length === 1, [rules]);
  const sharedLists = useMemo(() => {
    if (rules == null) return [];

    if (rules.length === 1) return rules[0].exceptions_list ?? [];

    const lists =
      rules?.map((rule) => (rule.exceptions_list != null ? rule.exceptions_list : [])) ?? [];

    lists.sort((a, b) => {
      return a.length - b.length;
    });

    const shortestArrOfLists = lists.shift();

    if (shortestArrOfLists == null || !shortestArrOfLists.length) return [];

    return shortestArrOfLists.filter((exceptionListInfo) =>
      lists.every((l) => l.some(({ id }) => exceptionListInfo.id === id))
    );
  }, [rules]);
  const rulesCount = useMemo(() => (rules != null ? rules.length : 0), [rules]);

  return (
    <EuiPanel paddingSize="none" hasShadow={false}>
      <SectionHeader size="xs">
        <h3>{i18n.ADD_TO_LISTS_SECTION_TITLE}</h3>
      </SectionHeader>
      <EuiSpacer size="s" />
      <ExceptionsAddToRulesOptions
        possibleRules={rules}
        isSingleRule={isSingleRule}
        isBulkAction={isBulkAction}
        selectedRadioOption={selectedRadioOption}
        onRuleSelectionChange={onRuleSelectionChange}
        onRadioChange={onRadioChange}
      />
      <ExceptionsAddToListsOptions
        rulesCount={rulesCount}
        selectedRadioOption={selectedRadioOption}
        sharedLists={sharedLists}
        onListsSelectionChange={onListSelectionChange}
        onRadioChange={onRadioChange}
      />
    </EuiPanel>
  );
};

export const ExceptionsAddToRulesOrLists = React.memo(ExceptionsAddToRulesOrListsComponent);

ExceptionsAddToRulesOrLists.displayName = 'ExceptionsAddToRulesOrLists';
