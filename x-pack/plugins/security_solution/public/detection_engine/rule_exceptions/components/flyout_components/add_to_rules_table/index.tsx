/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, EuiPanel, EuiText, EuiInMemoryTable } from '@elastic/eui';
import type { Rule } from '../../../../rule_management/logic/types';
import { useAddToRulesTable } from './use_add_to_rules_table';

interface ExceptionsAddToRulesComponentProps {
  initiallySelectedRules?: Rule[];
  onRuleSelectionChange?: (rulesSelectedToAdd: Rule[]) => void;
}

const ExceptionsAddToRulesTableComponent: React.FC<ExceptionsAddToRulesComponentProps> = ({
  initiallySelectedRules,
  onRuleSelectionChange,
}) => {
  const {
    isFetched,
    message,
    searchOptions,
    pagination,
    sortedRulesByLinkedRulesOnTop,
    rulesTableColumnsWithLinkSwitch,
    onTableChange,
    addToSelectedRulesDescription,
  } = useAddToRulesTable({
    initiallySelectedRules,
    onRuleSelectionChange,
  });
  return (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <>
        <EuiText size="s">{addToSelectedRulesDescription}</EuiText>
        <EuiSpacer size="s" />
        <EuiInMemoryTable<Rule>
          tableLayout="auto"
          search={searchOptions}
          data-test-subj="addExceptionToRulesTable"
          hasActions={true}
          tableCaption="Rules table"
          items={sortedRulesByLinkedRulesOnTop}
          loading={!isFetched}
          columns={rulesTableColumnsWithLinkSwitch}
          message={message}
          pagination={pagination}
          onTableChange={onTableChange}
        />
      </>
    </EuiPanel>
  );
};

export const ExceptionsAddToRulesTable = React.memo(ExceptionsAddToRulesTableComponent);

ExceptionsAddToRulesTable.displayName = 'ExceptionsAddToRulesTable';
