/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { useGetRuleMigrationsStatsAllQuery } from '../../../rule_management/api/hooks/siem_migrations/use_get_rule_migrations_stats_all';
import { useGetRuleMigrationsQuery } from '../../../rule_management/api/hooks/siem_migrations/use_get_rule_migrations';
import type { RuleSignatureId } from '../../../../../common/api/detection_engine';
import { invariant } from '../../../../../common/utils/invariant';
import type { SiemMigrationsTableFilterOptions } from './use_filter_siem_migrations_to_install';
import { useFilterSiemMigrationsToInstall } from './use_filter_siem_migrations_to_install';
import { useSiemMigrationsPreviewFlyout } from './use_siem_migrations_preview_flyout';

export interface SiemMigrationsTableState {
  /**
   * Available rule migrations ids
   */
  migrationsIds: string[];
  /**
   * Selected rule migration id
   */
  selectedMigrationId: string | undefined;
  /**
   * Rule migrations available after applying `filterOptions`
   */
  ruleMigrations: RuleMigration[];
  /**
   * Currently selected table filter
   */
  filterOptions: SiemMigrationsTableFilterOptions;
  /**
   * All unique tags for all rule translations
   */
  tags: string[];
  /**
   * If true then there is no cached data and the query is currently fetching.
   */
  isLoading: boolean;
  /**
   * Rule rows selected in EUI InMemory Table
   */
  selectedRuleMigrations: RuleMigration[];
}

export interface SiemMigrationsTableActions {
  setFilterOptions: Dispatch<SetStateAction<SiemMigrationsTableFilterOptions>>;
  selectRuleMigrations: (rules: RuleMigration[]) => void;
  openRuleTranslationPreview: (ruleId: RuleSignatureId) => void;
  onMigrationIdChange: (selectedId?: string) => void;
}

export interface SiemMigrationsContextType {
  state: SiemMigrationsTableState;
  actions: SiemMigrationsTableActions;
}

const SiemMigrationsTableContext = createContext<SiemMigrationsContextType | null>(null);

interface SiemMigrationsTableContextProviderProps {
  children: React.ReactNode;
}

const SIEM_MIGRATIONS_INSTALL_FLYOUT_ANCHOR = 'installSiemMigrationsPreview';

export const SiemMigrationsTableContextProvider = ({
  children,
}: SiemMigrationsTableContextProviderProps) => {
  const [selectedRuleMigrations, setSelectedRuleMigrations] = useState<RuleMigration[]>([]);

  const [filterOptions, setFilterOptions] = useState<SiemMigrationsTableFilterOptions>({
    filter: '',
    tags: [],
  });

  const { data: ruleMigrationsStatsAll, isLoading: isLoadingMigrationsStats } =
    useGetRuleMigrationsStatsAllQuery();
  const migrationsIds = useMemo(() => {
    if (isLoadingMigrationsStats || !ruleMigrationsStatsAll?.length) {
      return [];
    }
    return ruleMigrationsStatsAll
      .filter((migration) => migration.status === 'finished')
      .map((migration) => migration.migration_id);
  }, [isLoadingMigrationsStats, ruleMigrationsStatsAll]);

  const [selectedMigrationId, setSelectedMigrationId] = useState<string | undefined>();
  const onMigrationIdChange = (selectedId?: string) => {
    setSelectedMigrationId(selectedId);
  };

  useEffect(() => {
    if (!migrationsIds.length) {
      return;
    }
    const index = migrationsIds.findIndex((id) => id === selectedMigrationId);
    if (index === -1) {
      setSelectedMigrationId(migrationsIds[0]);
    }
  }, [migrationsIds, selectedMigrationId]);

  const { data: ruleMigrations, isLoading: isLoadingRuleMigrations } =
    useGetRuleMigrationsQuery(selectedMigrationId);

  const filteredRuleMigrations = useFilterSiemMigrationsToInstall({
    filterOptions,
    ruleMigrations: ruleMigrations ?? [],
  });

  const tags = useMemo<string[]>(() => [], []);

  const ruleActionsFactory = useCallback(
    (ruleMigration: RuleMigration, closeRuleMigrationPreview: () => void) => {
      // TODO: Add flyout action buttons
      return null;
    },
    []
  );

  const { ruleMigrationPreviewFlyout, openRuleTranslationPreview } = useSiemMigrationsPreviewFlyout(
    {
      ruleMigrations: filteredRuleMigrations,
      ruleActionsFactory,
      flyoutProps: {
        id: SIEM_MIGRATIONS_INSTALL_FLYOUT_ANCHOR,
        dataTestSubj: SIEM_MIGRATIONS_INSTALL_FLYOUT_ANCHOR,
      },
    }
  );

  const actions = useMemo(
    () => ({
      setFilterOptions,
      selectRuleMigrations: setSelectedRuleMigrations,
      openRuleTranslationPreview,
      onMigrationIdChange,
    }),
    [openRuleTranslationPreview]
  );

  const providerValue = useMemo<SiemMigrationsContextType>(() => {
    return {
      state: {
        migrationsIds,
        selectedMigrationId,
        ruleMigrations: filteredRuleMigrations,
        filterOptions,
        tags,
        isLoading: isLoadingMigrationsStats || isLoadingRuleMigrations,
        selectedRuleMigrations,
      },
      actions,
    };
  }, [
    migrationsIds,
    selectedMigrationId,
    filteredRuleMigrations,
    filterOptions,
    tags,
    isLoadingMigrationsStats,
    isLoadingRuleMigrations,
    selectedRuleMigrations,
    actions,
  ]);

  return (
    <SiemMigrationsTableContext.Provider value={providerValue}>
      <>
        {children}
        {ruleMigrationPreviewFlyout}
      </>
    </SiemMigrationsTableContext.Provider>
  );
};

export const useSiemMigrationsTableContext = (): SiemMigrationsContextType => {
  const rulesTableContext = useContext(SiemMigrationsTableContext);
  invariant(
    rulesTableContext,
    'useSiemMigrationsTableContext should be used inside SiemMigrationsTableContextProvider'
  );

  return rulesTableContext;
};
