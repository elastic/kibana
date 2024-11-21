/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiInMemoryTable,
  EuiSkeletonLoading,
  EuiProgress,
  EuiSkeletonTitle,
  EuiSkeletonText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React from 'react';

import {
  RULES_TABLE_INITIAL_PAGE_SIZE,
  RULES_TABLE_PAGE_SIZE_OPTIONS,
} from '../../../detection_engine/rule_management_ui/components/rules_table/constants';
import { SiemMigrationsTableNoItemsMessage } from './siem_migrations_no_items_message';
import { useSiemMigrationsTableContext } from './siem_migrations_table_context';
import { SiemMigrationsTableFilters } from './siem_migrations_table_filters';
import { useSiemMigrationsTableColumns } from './use_siem_migrations_table_columns';

/**
 * Table Component for displaying SIEM rules migrations
 */
export const SiemMigrationsTable = React.memo(() => {
  const siemMigrationsTableContext = useSiemMigrationsTableContext();

  const {
    state: { ruleMigrations, isLoading, selectedRuleMigrations },
    actions: { selectRuleMigrations },
  } = siemMigrationsTableContext;
  const rulesColumns = useSiemMigrationsTableColumns();

  const shouldShowProgress = isLoading;

  return (
    <>
      {shouldShowProgress && (
        <EuiProgress
          data-test-subj="loadingRulesInfoProgress"
          size="xs"
          position="absolute"
          color="accent"
        />
      )}
      <EuiSkeletonLoading
        isLoading={isLoading}
        loadingContent={
          <>
            <EuiSkeletonTitle />
            <EuiSkeletonText />
          </>
        }
        loadedContent={
          !ruleMigrations.length ? (
            <SiemMigrationsTableNoItemsMessage />
          ) : (
            <>
              <EuiFlexGroup direction="column">
                <EuiFlexItem grow={false}>
                  <SiemMigrationsTableFilters />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiInMemoryTable
                items={ruleMigrations}
                sorting
                pagination={{
                  initialPageSize: RULES_TABLE_INITIAL_PAGE_SIZE,
                  pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
                }}
                selection={{
                  selectable: () => true,
                  onSelectionChange: selectRuleMigrations,
                  initialSelected: selectedRuleMigrations,
                }}
                itemId="rule_id"
                data-test-subj="rules-translation-table"
                columns={rulesColumns}
              />
            </>
          )
        }
      />
    </>
  );
});

SiemMigrationsTable.displayName = 'SiemMigrationsTable';
