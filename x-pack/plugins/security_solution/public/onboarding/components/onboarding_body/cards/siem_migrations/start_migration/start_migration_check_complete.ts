/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleMigrationsStatsAll } from '../../../../../../siem_migrations/rules/api/api';
import type { OnboardingCardCheckComplete } from '../../../../../types';
import type { StartMigrationCardMetadata } from './types';

export const checkStartMigrationCardComplete: OnboardingCardCheckComplete<
  StartMigrationCardMetadata
> = async () => {
  const migrationsStats = await getRuleMigrationsStatsAll();
  const isComplete = migrationsStats.length > 0;
  return { isComplete, metadata: { migrationsStats } };
};
