/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiSkeletonLoading,
  EuiSkeletonTitle,
  EuiSkeletonText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiBasicTable,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { EmptyMigration } from './empty_migration';
import { useMigrationRulesTableColumns } from '../../hooks/use_migration_rules_table_columns';
import { useMigrationRuleDetailsFlyout } from '../../hooks/use_migration_rule_preview_flyout';
import { useInstallMigrationRules } from '../../logic/use_install_migration_rules';
import { useGetMigrationRules } from '../../logic/use_get_migration_rules';
import { useInstallTranslatedMigrationRules } from '../../logic/use_install_translated_migration_rules';
import { useGetMigrationTranslationStats } from '../../logic/use_get_migration_translation_stats';
import * as logicI18n from '../../logic/translations';
import { BulkActions } from './bulk_actions';
import { SearchField } from './search_field';

const DEFAULT_PAGE_SIZE = 10;

export interface MigrationRulesTableProps {
  /**
   * Selected rule migration id
   */
  migrationId: string;
}

/**
 * Table Component for displaying SIEM rules migrations
 */
export const MigrationRulesTable: React.FC<MigrationRulesTableProps> = React.memo(
  ({ migrationId }) => {
    const { addError } = useAppToasts();

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [searchTerm, setSearchTerm] = useState<string | undefined>();

    const { data: translationStats, isLoading: isStatsLoading } =
      useGetMigrationTranslationStats(migrationId);

    const {
      data: { ruleMigrations, total } = { ruleMigrations: [], total: 0 },
      isLoading: isDataLoading,
    } = useGetMigrationRules({
      migrationId,
      page: pageIndex,
      perPage: pageSize,
      searchTerm,
    });

    const [selectedRuleMigrations, setSelectedRuleMigrations] = useState<RuleMigration[]>([]);

    const pagination = useMemo(() => {
      return {
        pageIndex,
        pageSize,
        totalItemCount: total,
      };
    }, [pageIndex, pageSize, total]);

    const onTableChange = useCallback(({ page, sort }: CriteriaWithPagination<RuleMigration>) => {
      if (page) {
        setPageIndex(page.index);
        setPageSize(page.size);
      }
    }, []);

    const handleOnSearch = useCallback((value: string) => {
      setSearchTerm(value.trim());
    }, []);

    const { mutateAsync: installMigrationRules } = useInstallMigrationRules(migrationId);
    const { mutateAsync: installTranslatedMigrationRules } =
      useInstallTranslatedMigrationRules(migrationId);

    const [isTableLoading, setTableLoading] = useState(false);
    const installSingleRule = useCallback(
      async (migrationRule: RuleMigration, enable?: boolean) => {
        setTableLoading(true);
        try {
          await installMigrationRules([migrationRule.id]);
        } catch (error) {
          addError(error, { title: logicI18n.INSTALL_MIGRATION_RULES_FAILURE });
        } finally {
          setTableLoading(false);
        }
      },
      [addError, installMigrationRules]
    );

    const installTranslatedRules = useCallback(
      async (enable?: boolean) => {
        setTableLoading(true);
        try {
          await installTranslatedMigrationRules();
        } catch (error) {
          addError(error, { title: logicI18n.INSTALL_MIGRATION_RULES_FAILURE });
        } finally {
          setTableLoading(false);
        }
      },
      [addError, installTranslatedMigrationRules]
    );

    const ruleActionsFactory = useCallback(
      (ruleMigration: RuleMigration, closeRulePreview: () => void) => {
        // TODO: Add flyout action buttons
        return null;
      },
      []
    );

    const {
      migrationRuleDetailsFlyout: rulePreviewFlyout,
      openMigrationRuleDetails: openRulePreview,
    } = useMigrationRuleDetailsFlyout({
      ruleActionsFactory,
    });

    const rulesColumns = useMigrationRulesTableColumns({
      disableActions: isTableLoading,
      openMigrationRuleDetails: openRulePreview,
      installMigrationRule: installSingleRule,
    });

    return (
      <>
        <EuiSkeletonLoading
          isLoading={isDataLoading}
          loadingContent={
            <>
              <EuiSkeletonTitle />
              <EuiSkeletonText />
            </>
          }
          loadedContent={
            !translationStats?.rules.total ? (
              <EmptyMigration />
            ) : (
              <>
                <EuiFlexGroup gutterSize="m" justifyContent="flexEnd" wrap>
                  <EuiFlexItem>
                    <SearchField initialValue={searchTerm} onSearch={handleOnSearch} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <BulkActions
                      isTableLoading={isStatsLoading || isDataLoading || isTableLoading}
                      numberOfTranslatedRules={translationStats?.rules.installable ?? 0}
                      numberOfSelectedRules={0}
                      installTranslatedRule={installTranslatedRules}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiBasicTable<RuleMigration>
                  loading={isTableLoading}
                  items={ruleMigrations}
                  pagination={pagination}
                  onChange={onTableChange}
                  selection={{
                    selectable: () => true,
                    onSelectionChange: setSelectedRuleMigrations,
                    initialSelected: selectedRuleMigrations,
                  }}
                  itemId={'id'}
                  data-test-subj={'rules-translation-table'}
                  columns={rulesColumns}
                />
              </>
            )
          }
        />
        {rulePreviewFlyout}
      </>
    );
  }
);
MigrationRulesTable.displayName = 'MigrationRulesTable';
