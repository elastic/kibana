/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { OnboardingCardId } from '../../../../../constants';
import type { RuleMigrationTaskStats } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { useLatestStats } from '../../../../../../siem_migrations/rules/service/hooks/use_latest_stats';
import { MigrationDataInputFlyout } from '../../../../../../siem_migrations/rules/components/data_input_flyout';
import { CenteredLoadingSpinner } from '../../../../../../common/components/centered_loading_spinner';
import type { OnboardingCardComponent } from '../../../../../types';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import { UploadRulesPanels } from './upload_rules_panels';
import { StartMigrationContextProvider } from './context';
import { useStyles } from './start_migration_card.styles';
import * as i18n from './translations';
import { MissingAIConnectorCallout } from './missing_ai_connector_callout';

export const StartMigrationCard: OnboardingCardComponent = React.memo(
  ({ checkComplete, isCardComplete, setExpandedCardId }) => {
    const styles = useStyles();
    const { data: migrationsStats, isLoading } = useLatestStats();

    const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>();
    const [flyoutMigrationStats, setFlyoutMigrationStats] = useState<
      RuleMigrationTaskStats | undefined
    >();

    const closeFlyout = useCallback(() => {
      setIsFlyoutOpen(false);
      setFlyoutMigrationStats(undefined);
      if (!isCardComplete(OnboardingCardId.siemMigrationsStart)) {
        checkComplete();
      }
    }, [checkComplete, isCardComplete]);

    const openFlyout = useCallback((migrationStats?: RuleMigrationTaskStats) => {
      setFlyoutMigrationStats(migrationStats);
      setIsFlyoutOpen(true);
    }, []);

    if (!isCardComplete(OnboardingCardId.siemMigrationsAiConnectors)) {
      return (
        <MissingAIConnectorCallout
          onExpandAiConnectorsCard={() =>
            setExpandedCardId(OnboardingCardId.siemMigrationsAiConnectors)
          }
        />
      );
    }

    return (
      <StartMigrationContextProvider openFlyout={openFlyout} closeFlyout={closeFlyout}>
        <OnboardingCardContentPanel paddingSize="none" className={styles}>
          {isLoading ? (
            <CenteredLoadingSpinner />
          ) : (
            <UploadRulesPanels migrationsStats={migrationsStats} />
          )}
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <p>{i18n.START_MIGRATION_CARD_FOOTER_NOTE}</p>
          </EuiText>
        </OnboardingCardContentPanel>
        {isFlyoutOpen && (
          <MigrationDataInputFlyout onClose={closeFlyout} migrationStats={flyoutMigrationStats} />
        )}
      </StartMigrationContextProvider>
    );
  }
);
StartMigrationCard.displayName = 'StartMigrationCard';

// eslint-disable-next-line import/no-default-export
export default StartMigrationCard;
