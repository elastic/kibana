/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { OnboardingCardConfig } from '../../../../../types';
import { OnboardingCardId } from '../../../../../constants';
import { START_MIGRATION_CARD_TITLE } from './translations';
import cardIcon from './images/card_header_icon.png';
import { checkStartMigrationCardComplete } from './start_migration_check_complete';

export const startMigrationCardConfig: OnboardingCardConfig = {
  id: OnboardingCardId.siemMigrationsStart,
  title: START_MIGRATION_CARD_TITLE,
  icon: cardIcon,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_siem_migrations_upload_rules_card" */
        './start_migration_card'
      )
  ),
  checkComplete: checkStartMigrationCardComplete,
  licenseTypeRequired: 'enterprise',
};
