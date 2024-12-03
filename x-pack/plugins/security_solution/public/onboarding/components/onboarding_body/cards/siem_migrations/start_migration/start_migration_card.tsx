/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { RuleMigrationTaskStats } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { useLatestStats } from '../../../../../../siem_migrations/rules/service/hooks/use_latest_stats';
import { MigrationDataInputFlyout } from '../../../../../../siem_migrations/rules/components/data_input_flyout';
import { CenteredLoadingSpinner } from '../../../../../../common/components/centered_loading_spinner';
import type { OnboardingCardComponent } from '../../../../../types';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import { UploadRulesPanels } from './upload_rules_panels';
import { StartMigrationContextProvider } from './context';
import { useStyles } from './start_migration_card.styles';

export const StartMigrationCard: OnboardingCardComponent = ({ checkComplete, setComplete }) => {
  const styles = useStyles();
  const { data: migrationsStats, isLoading } = useLatestStats();

  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>();
  const [flyoutMigrationStats, setFlyoutMigrationStats] = useState<
    RuleMigrationTaskStats | undefined
  >();

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setFlyoutMigrationStats(undefined);
  }, []);

  const openFlyout = useCallback((migrationStats?: RuleMigrationTaskStats) => {
    setFlyoutMigrationStats(migrationStats);
    setIsFlyoutOpen(true);
  }, []);

  return (
    <StartMigrationContextProvider openFlyout={openFlyout} closeFlyout={closeFlyout}>
      <OnboardingCardContentPanel paddingSize="none" className={styles}>
        {isLoading ? (
          <CenteredLoadingSpinner />
        ) : (
          <UploadRulesPanels migrationsStats={migrationsStats} />
        )}
      </OnboardingCardContentPanel>
      {isFlyoutOpen && (
        <MigrationDataInputFlyout onClose={closeFlyout} migrationStats={flyoutMigrationStats} />
      )}
    </StartMigrationContextProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default StartMigrationCard;
