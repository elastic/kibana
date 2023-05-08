/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Search } from '@elastic/eui';
import { EuiSkeletonText, EuiSpacer, EuiPanel, EuiText, EuiInMemoryTable } from '@elastic/eui';
import type { Rule } from '../../../rule_management/logic/types';
import { useCopyRuleConfigurationsTable } from './use_copy_rule_configs_table';

interface CopyRuleConfigurationsComponentProps {
  onRuleSelectionChange: (rulesSelectedToAdd: Rule[]) => void;
}

const CopyRuleConfigurationsTableComponent: React.FC<CopyRuleConfigurationsComponentProps> = ({
  onRuleSelectionChange,
}) => {
  const {
    isLoading,
    searchOptions,
    pagination,
    rules,
    rulesTableColumns,
    onTableChange,
    copyRuleConfigurationsDescription,
  } = useCopyRuleConfigurationsTable({
    onRuleSelectionChange,
  });
  return (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <>
        <EuiText size="s">{copyRuleConfigurationsDescription}</EuiText>
        <EuiSpacer size="s" />
        <EuiInMemoryTable<Rule>
          tableLayout="auto"
          search={searchOptions as Search}
          data-test-subj="addExceptionToRulesTable"
          tableCaption="Rules table"
          items={rules}
          loading={isLoading}
          columns={rulesTableColumns}
          message={
            isLoading ? (
              <EuiSkeletonText
                lines={4}
                data-test-subj="copyRuleConfigurationsItemViewerEmptyPromptsLoading"
              />
            ) : undefined
          }
          pagination={pagination}
          onTableChange={onTableChange}
        />
      </>
    </EuiPanel>
  );
};

export const CopyRuleConfigurationsTable = React.memo(CopyRuleConfigurationsTableComponent);

CopyRuleConfigurationsTable.displayName = 'CopyRuleConfigurationsTable';
