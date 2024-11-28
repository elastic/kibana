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
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import {
  RULES_TABLE_INITIAL_PAGE_SIZE,
  RULES_TABLE_PAGE_SIZE_OPTIONS,
} from '../../../../detection_engine/rule_management_ui/components/rules_table/constants';
import { NoItemsMessage } from './no_items_message';
import { Filters } from './filters';
import { useRulesTableColumns } from '../../hooks/use_rules_table_columns';
import type { TableFilterOptions } from '../../hooks/use_filter_rules_to_install';
import { useFilterRulesToInstall } from '../../hooks/use_filter_rules_to_install';
import { useRulePreviewFlyout } from '../../hooks/use_rule_preview_flyout';
import { useInstallMigrationRules } from '../../logic/use_install_migration_rules';
import { useGetMigrationRules } from '../../logic/use_get_migration_rules';
import { useInstallAllMigrationRules } from '../../logic/use_install_all_migration_rules';
import { BulkActions } from './bulk_actions';

export interface RulesTableComponentProps {
  /**
   * Selected rule migration id
   */
  migrationId: string;
}

/**
 * Table Component for displaying SIEM rules migrations
 */
const RulesTableComponent: React.FC<RulesTableComponentProps> = ({ migrationId }) => {
  const { data: ruleMigrations, isLoading: isDataLoading } = useGetMigrationRules(migrationId);

  const [selectedRuleMigrations, setSelectedRuleMigrations] = useState<RuleMigration[]>([]);

  const [filterOptions, setFilterOptions] = useState<TableFilterOptions>({
    filter: '',
  });

  const filteredRuleMigrations = useFilterRulesToInstall({
    filterOptions,
    ruleMigrations: ruleMigrations ?? [],
  });

  const { mutateAsync: installMigrationRules } = useInstallMigrationRules(migrationId);
  const { mutateAsync: installAllMigrationRules } = useInstallAllMigrationRules(migrationId);

  const numberOfTranslatedRules = useMemo(() => {
    return filteredRuleMigrations.filter(
      (rule) =>
        !rule.elastic_rule?.id &&
        (rule.elastic_rule?.prebuilt_rule_id || rule.translation_result === 'full')
    ).length;
  }, [filteredRuleMigrations]);

  const [isTableLoading, setTableLoading] = useState(false);
  const installSingleRule = useCallback(
    async (migrationRule: RuleMigration, enable?: boolean) => {
      setTableLoading(true);
      try {
        await installMigrationRules([migrationRule.id]);
      } finally {
        setTableLoading(false);
      }
    },
    [installMigrationRules]
  );

  const installTranslatedRules = useCallback(
    async (enable?: boolean) => {
      setTableLoading(true);
      try {
        await installAllMigrationRules();
      } finally {
        setTableLoading(false);
      }
    },
    [installAllMigrationRules]
  );

  const ruleActionsFactory = useCallback(
    (ruleMigration: RuleMigration, closeRulePreview: () => void) => {
      // TODO: Add flyout action buttons
      return null;
    },
    []
  );

  const { rulePreviewFlyout, openRulePreview } = useRulePreviewFlyout({
    ruleActionsFactory,
  });

  const shouldShowProgress = isDataLoading;

  const rulesColumns = useRulesTableColumns({
    disableActions: isTableLoading,
    openMigrationRulePreview: openRulePreview,
    installMigrationRule: installSingleRule,
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
        isLoading={isDataLoading}
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
              <EuiFlexGroup gutterSize="m" justifyContent="flexEnd" wrap>
                <EuiFlexItem>
                  <Filters filterOptions={filterOptions} setFilterOptions={setFilterOptions} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <BulkActions
                    isTableLoading={isDataLoading || isTableLoading}
                    numberOfTranslatedRules={numberOfTranslatedRules}
                    numberOfSelectedRules={0}
                    installTranslatedRule={installTranslatedRules}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiInMemoryTable
                loading={isTableLoading}
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
      {rulePreviewFlyout}
    </>
  );
};

export const RulesTable = React.memo(RulesTableComponent);
RulesTable.displayName = 'RulesTable';
