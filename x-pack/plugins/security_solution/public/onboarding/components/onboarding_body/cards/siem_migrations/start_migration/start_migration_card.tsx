/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { RuleMigrationDataInputWrapper } from '../../../../../../siem_migrations/rules/components/data_input_flyout/data_input_wrapper';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import { OnboardingCardId } from '../../../../../constants';
import { useLatestStats } from '../../../../../../siem_migrations/rules/service/hooks/use_latest_stats';
import { CenteredLoadingSpinner } from '../../../../../../common/components/centered_loading_spinner';
import type { OnboardingCardComponent } from '../../../../../types';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import { UploadRulesPanels } from './upload_rules_panels';
import { useStyles } from './start_migration_card.styles';
import * as i18n from './translations';
import { MissingAIConnectorCallout } from './missing_ai_connector_callout';

export const StartMigrationCard: OnboardingCardComponent = React.memo(
  ({ setComplete, isCardComplete, setExpandedCardId }) => {
    const styles = useStyles();
    const { data: migrationsStats, isLoading, refreshStats } = useLatestStats();

    useEffect(() => {
      // Set card complete if any migration is finished
      if (!isCardComplete(OnboardingCardId.siemMigrationsStart) && migrationsStats) {
        if (migrationsStats.some(({ status }) => status === SiemMigrationTaskStatus.FINISHED)) {
          setComplete(true);
        }
      }
    }, [isCardComplete, migrationsStats, setComplete]);

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
      <RuleMigrationDataInputWrapper onFlyoutClosed={refreshStats}>
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
      </RuleMigrationDataInputWrapper>
    );
  }
);
StartMigrationCard.displayName = 'StartMigrationCard';

// eslint-disable-next-line import/no-default-export
export default StartMigrationCard;
