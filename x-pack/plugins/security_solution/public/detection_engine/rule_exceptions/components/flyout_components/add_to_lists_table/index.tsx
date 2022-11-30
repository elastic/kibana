/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiSpacer, EuiInMemoryTable, EuiPanel, EuiLoadingContent } from '@elastic/eui';

import type { ExceptionListRuleReferencesSchema } from '../../../../../../common/detection_engine/rule_exceptions';
import type { ExceptionsAddToListsComponentProps } from './use_add_to_lists_table';
import { useAddToSharedListTable } from './use_add_to_lists_table';

const ExceptionsAddToListsComponent: React.FC<ExceptionsAddToListsComponentProps> = ({
  showAllSharedLists,
  sharedExceptionLists,
  onListSelectionChange,
}) => {
  const selectionValue = {
    onSelectionChange: (selection: ExceptionListRuleReferencesSchema[]) => {
      if (onListSelectionChange != null) {
        onListSelectionChange(
          selection.map(
            ({
              referenced_rules: _,
              namespace_type: namespaceType,
              os_types: osTypes,
              tags,
              ...rest
            }) => ({
              ...rest,
              namespace_type: namespaceType ?? 'single',
              os_types: osTypes ?? [],
              tags: tags ?? [],
            })
          )
        );
      }
    },
    initialSelected: [],
  };

  const {
    error,
    isLoading,
    pagination,
    sortedLists,
    listTableColumnsWithLinkSwitch,
    onTableChange,
    addToSelectedListDescription,
  } = useAddToSharedListTable({ showAllSharedLists, sharedExceptionLists, onListSelectionChange });

  return (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <>
        <EuiText size="s">{addToSelectedListDescription}</EuiText>
        <EuiSpacer size="s" />
        <EuiSpacer size="s" />
        <EuiInMemoryTable<ExceptionListRuleReferencesSchema>
          sorting
          tableLayout="auto"
          tableCaption="Table of exception lists"
          data-test-subj="addExceptionToSharedListsTable"
          error={error}
          items={sortedLists}
          loading={isLoading}
          message={
            isLoading ? (
              <EuiLoadingContent
                lines={4}
                data-test-subj="exceptionItemViewerEmptyPrompts-loading"
              />
            ) : undefined
          }
          columns={listTableColumnsWithLinkSwitch}
          pagination={pagination}
          onTableChange={onTableChange}
        />
      </>
    </EuiPanel>
  );
};

export const ExceptionsAddToListsTable = React.memo(ExceptionsAddToListsComponent);

ExceptionsAddToListsTable.displayName = 'ExceptionsAddToListsTable';
