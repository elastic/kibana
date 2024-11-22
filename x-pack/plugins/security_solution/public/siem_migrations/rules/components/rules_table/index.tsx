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
import React, { useState } from 'react';

import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import {
  RULES_TABLE_INITIAL_PAGE_SIZE,
  RULES_TABLE_PAGE_SIZE_OPTIONS,
} from '../../../../detection_engine/rule_management_ui/components/rules_table/constants';
import { NoItemsMessage } from './no_items_message';
import { Filters } from './filters';
import { useRulesTableColumns } from '../../hooks/use_rules_table_columns';
import { useGetRuleMigrationsQuery } from '../../api/hooks/use_get_rule_migrations';
import type { TableFilterOptions } from '../../hooks/use_filter_rules_to_install';
import { useFilterRulesToInstall } from '../../hooks/use_filter_rules_to_install';

export interface RulesTableComponentProps {
  /**
   * Selected rule migration id
   */
  migrationId: string;

  /**
   * Opens the flyout with the details of the rule migration
   * @param rule Rule migration
   * @returns
   */
  openRulePreview: (rule: RuleMigration) => void;
}

/**
 * Table Component for displaying SIEM rules migrations
 */
const RulesTableComponent: React.FC<RulesTableComponentProps> = ({
  migrationId,
  openRulePreview,
}) => {
  const { data: ruleMigrations, isLoading } = useGetRuleMigrationsQuery(migrationId);

  const [selectedRuleMigrations, setSelectedRuleMigrations] = useState<RuleMigration[]>([]);

  const [filterOptions, setFilterOptions] = useState<TableFilterOptions>({
    filter: '',
  });

  const filteredRuleMigrations = useFilterRulesToInstall({
    filterOptions,
    ruleMigrations: ruleMigrations ?? [],
  });

  const shouldShowProgress = isLoading;

  const rulesColumns = useRulesTableColumns({
    openRulePreview,
  });

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
          !filteredRuleMigrations.length ? (
            <NoItemsMessage />
          ) : (
            <>
              <EuiFlexGroup direction="column">
                <EuiFlexItem grow={false}>
                  <Filters filterOptions={filterOptions} setFilterOptions={setFilterOptions} />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiInMemoryTable
                items={filteredRuleMigrations}
                sorting
                pagination={{
                  initialPageSize: RULES_TABLE_INITIAL_PAGE_SIZE,
                  pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
                }}
                selection={{
                  selectable: () => true,
                  onSelectionChange: setSelectedRuleMigrations,
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
};

export const RulesTable = React.memo(RulesTableComponent);
RulesTable.displayName = 'RulesTable';
