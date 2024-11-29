/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { MigrationDataInputFlyout } from '../../../../../../siem_migrations/rules/components/data_input_flyout';
import { CenteredLoadingSpinner } from '../../../../../../common/components/centered_loading_spinner';
import type { OnboardingCardComponent } from '../../../../../types';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import type { StartMigrationCardMetadata } from './types';
import { UploadRulesPanels } from './upload_rules_panels';
import { StartMigrationContextProvider } from './context';

export const StartMigrationCard: OnboardingCardComponent<StartMigrationCardMetadata> = ({
  checkCompleteMetadata,
  checkComplete,
  setComplete,
}) => {
  const migrationsStats = checkCompleteMetadata?.migrationsStats;
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);

  const onClose = useCallback(() => setIsFlyoutOpen(false), [setIsFlyoutOpen]);

  return (
    <StartMigrationContextProvider setIsFlyoutOpen={setIsFlyoutOpen}>
      <OnboardingCardContentPanel paddingSize="none">
        {migrationsStats == null ? (
          <CenteredLoadingSpinner />
        ) : (
          <UploadRulesPanels migrationsStats={migrationsStats} />
        )}
      </OnboardingCardContentPanel>
      {isFlyoutOpen && <MigrationDataInputFlyout onClose={onClose} />}
    </StartMigrationContextProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default StartMigrationCard;
