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
  SIEM_RULE_MIGRATION_INSTALL_TRANSLATED_PATH,
  SIEM_RULE_MIGRATION_INSTALL_PATH,
  SIEM_RULE_MIGRATION_PATH,
  SIEM_RULE_MIGRATION_START_PATH,
  SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH,
} from '../../../../common/siem_migrations/constants';
import type {
  GetAllStatsRuleMigrationResponse,
  GetRuleMigrationResponse,
  GetRuleMigrationTranslationStatsResponse,
  InstallTranslatedMigrationRulesResponse,
  InstallMigrationRulesResponse,
  StartRuleMigrationRequestBody,
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
    { method: 'GET', version: '1', signal }
  );
};

/**
 * Starts a new migration with the provided rules.
 *
 * @param migrationId `id` of the migration to start
 * @param body The body containing the `connectorId` to use for the migration
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const startRuleMigration = async ({
  migrationId,
  body,
  signal,
}: {
  migrationId: string;
  body: StartRuleMigrationRequestBody;
  signal: AbortSignal | undefined;
}): Promise<GetAllStatsRuleMigrationResponse> => {
  return KibanaServices.get().http.put<GetAllStatsRuleMigrationResponse>(
    replaceParams(SIEM_RULE_MIGRATION_START_PATH, { migration_id: migrationId }),
    { body: JSON.stringify(body), version: '1', signal }
  );
};

/**
 * Retrieves the translation stats for the migraion.
 *
 * @param migrationId `id` of the migration to retrieve translation stats for
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getRuleMigrationTranslationStats = async ({
  migrationId,
  signal,
}: {
  migrationId: string;
  signal: AbortSignal | undefined;
}): Promise<GetRuleMigrationTranslationStatsResponse> => {
  return KibanaServices.get().http.fetch<GetRuleMigrationTranslationStatsResponse>(
    replaceParams(SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH, { migration_id: migrationId }),
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
  page,
  perPage,
  searchTerm,
  signal,
}: {
  migrationId: string;
  page?: number;
  perPage?: number;
  searchTerm?: string;
  signal: AbortSignal | undefined;
}): Promise<GetRuleMigrationResponse> => {
  return KibanaServices.get().http.fetch<GetRuleMigrationResponse>(
    replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }),
    {
      method: 'GET',
      version: '1',
      query: {
        page,
        per_page: perPage,
        search_term: searchTerm,
      },
      signal,
    }
  );
};

export const installMigrationRules = async ({
  migrationId,
  ids,
  signal,
}: {
  migrationId: string;
  ids: string[];
  signal?: AbortSignal;
}): Promise<InstallMigrationRulesResponse> => {
  return KibanaServices.get().http.fetch<InstallMigrationRulesResponse>(
    replaceParams(SIEM_RULE_MIGRATION_INSTALL_PATH, { migration_id: migrationId }),
    {
      method: 'POST',
      version: '1',
      body: JSON.stringify(ids),
      signal,
    }
  );
};

export const installTranslatedMigrationRules = async ({
  migrationId,
  signal,
}: {
  migrationId: string;
  signal?: AbortSignal;
}): Promise<InstallTranslatedMigrationRulesResponse> => {
  return KibanaServices.get().http.fetch<InstallTranslatedMigrationRulesResponse>(
    replaceParams(SIEM_RULE_MIGRATION_INSTALL_TRANSLATED_PATH, { migration_id: migrationId }),
    {
      method: 'POST',
      version: '1',
      signal,
    }
  );
};
