/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import { EuiSkeletonLoading, EuiSkeletonText, EuiSkeletonTitle } from '@elastic/eui';
import type { RouteComponentProps } from 'react-router-dom';
import { useNavigation } from '../../../common/lib/kibana';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SecurityPageName } from '../../../app/types';

import * as i18n from './translations';
import { RulesTable } from '../components/rules_table';
import { NeedAdminForUpdateRulesCallOut } from '../../../detections/components/callouts/need_admin_for_update_callout';
import { MissingPrivilegesCallOut } from '../../../detections/components/callouts/missing_privileges_callout';
import { HeaderButtons } from '../components/header_buttons';
import { UnknownMigration } from '../components/unknown_migration';
import { useLatestStats } from '../hooks/use_latest_stats';

type RulesMigrationPageProps = RouteComponentProps<{ migrationId?: string }>;

export const RulesPage: React.FC<RulesMigrationPageProps> = React.memo(
  ({
    match: {
      params: { migrationId },
    },
  }) => {
    const { navigateTo } = useNavigation();

    const { data: ruleMigrationsStatsAll, isLoading: isLoadingMigrationsStats } = useLatestStats();

    const migrationsIds = useMemo(() => {
      if (isLoadingMigrationsStats || !ruleMigrationsStatsAll?.length) {
        return [];
      }
      return ruleMigrationsStatsAll
        .filter((migration) => migration.status === 'finished')
        .map((migration) => migration.id);
    }, [isLoadingMigrationsStats, ruleMigrationsStatsAll]);

    useEffect(() => {
      if (isLoadingMigrationsStats) {
        return;
      }

      // Navigate to landing page if there are no migrations
      if (!migrationsIds.length) {
        navigateTo({ deepLinkId: SecurityPageName.landing, path: 'siem_migrations' });
        return;
      }

      // Navigate to the most recent migration if none is selected
      if (!migrationId) {
        navigateTo({ deepLinkId: SecurityPageName.siemMigrationsRules, path: migrationsIds[0] });
      }
    }, [isLoadingMigrationsStats, migrationId, migrationsIds, navigateTo]);

    const onMigrationIdChange = (selectedId?: string) => {
      navigateTo({ deepLinkId: SecurityPageName.siemMigrationsRules, path: selectedId });
    };

    const content = useMemo(() => {
      if (!migrationId || !migrationsIds.includes(migrationId)) {
        return <UnknownMigration />;
      }
      return <RulesTable migrationId={migrationId} />;
    }, [migrationId, migrationsIds]);

    return (
      <>
        <NeedAdminForUpdateRulesCallOut />
        <MissingPrivilegesCallOut />

        <SecuritySolutionPageWrapper>
          <HeaderPage title={i18n.PAGE_TITLE}>
            <HeaderButtons
              migrationsIds={migrationsIds}
              selectedMigrationId={migrationId}
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
            loadedContent={content}
          />
        </SecuritySolutionPageWrapper>
      </>
    );
  }
);
RulesPage.displayName = 'RulesPage';
