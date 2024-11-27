/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { EuiSkeletonLoading, EuiSkeletonText, EuiSkeletonTitle } from '@elastic/eui';
import type { RuleMigration } from '../../../../common/siem_migrations/model/rule_migration.gen';
import { SecurityPageName } from '../../../app/types';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SpyRoute } from '../../../common/utils/route/spy_routes';

import * as i18n from './translations';
import { RulesTable } from '../components/rules_table';
import { NeedAdminForUpdateRulesCallOut } from '../../../detections/components/callouts/need_admin_for_update_callout';
import { MissingPrivilegesCallOut } from '../../../detections/components/callouts/missing_privileges_callout';
import { HeaderButtons } from '../components/header_buttons';
import { useGetRuleMigrationsStatsAllQuery } from '../api/hooks/use_get_rule_migrations_stats_all';
import { useRulePreviewFlyout } from '../hooks/use_rule_preview_flyout';
import { NoMigrations } from '../components/no_migrations';

const RulesPageComponent: React.FC = () => {
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

  return (
    <>
      <NeedAdminForUpdateRulesCallOut />
      <MissingPrivilegesCallOut />

      <SecuritySolutionPageWrapper>
        <HeaderPage title={i18n.PAGE_TITLE}>
          <HeaderButtons
            migrationsIds={migrationsIds}
            selectedMigrationId={selectedMigrationId}
            onMigrationIdChange={onMigrationIdChange}
          />
        </HeaderPage>
        <EuiSkeletonLoading
          isLoading={isLoadingMigrationsStats}
          loadingContent={
            <>
              <EuiSkeletonTitle />
              <EuiSkeletonText />
            </>
          }
          loadedContent={
            selectedMigrationId ? (
              <RulesTable migrationId={selectedMigrationId} openRulePreview={openRulePreview} />
            ) : (
              <NoMigrations />
            )
          }
        />
        {rulePreviewFlyout}
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.siemMigrationsRules} />
    </>
  );
};

export const RulesPage = React.memo(RulesPageComponent);
RulesPage.displayName = 'RulesPage';
