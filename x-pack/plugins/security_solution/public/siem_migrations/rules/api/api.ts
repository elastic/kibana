/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceParams } from '@kbn/openapi-common/shared';

import { KibanaServices } from '../../../common/lib/kibana';

import {
  SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
  SIEM_RULE_MIGRATION_PATH,
} from '../../../../common/siem_migrations/constants';
import type {
  GetAllStatsRuleMigrationResponse,
  GetRuleMigrationResponse,
} from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';

/**
 * Retrieves the stats for all the existing migrations, aggregated by `migration_id`.
 *
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getRuleMigrationsStatsAll = async ({
  signal,
}: {
  signal: AbortSignal | undefined;
}): Promise<GetAllStatsRuleMigrationResponse> => {
  return KibanaServices.get().http.fetch<GetAllStatsRuleMigrationResponse>(
    SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
    {
      method: 'GET',
      version: '1',
      signal,
    }
  );
};

/**
 * Retrieves all the migration rule documents of a specific migration.
 *
 * @param migrationId `id` of the migration to retrieve rule documents for
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getRuleMigrations = async ({
  migrationId,
  signal,
}: {
  migrationId: string;
  signal: AbortSignal | undefined;
}): Promise<GetRuleMigrationResponse> => {
  return KibanaServices.get().http.fetch<GetRuleMigrationResponse>(
    replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }),
    {
      method: 'GET',
      version: '1',
      signal,
    }
  );
};
