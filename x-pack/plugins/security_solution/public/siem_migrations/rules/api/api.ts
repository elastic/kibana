/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceParams } from '@kbn/openapi-common/shared';

import type { LangSmithOptions } from '../../../../common/siem_migrations/model/common.gen';
import { KibanaServices } from '../../../common/lib/kibana';

import {
  SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
  SIEM_RULE_MIGRATION_INSTALL_TRANSLATED_PATH,
  SIEM_RULE_MIGRATION_INSTALL_PATH,
  SIEM_RULE_MIGRATION_PATH,
  SIEM_RULE_MIGRATION_START_PATH,
} from '../../../../common/siem_migrations/constants';
import type {
  CreateRuleMigrationRequestBody,
  CreateRuleMigrationResponse,
  GetAllStatsRuleMigrationResponse,
  GetRuleMigrationResponse,
  InstallTranslatedMigrationRulesResponse,
  InstallMigrationRulesResponse,
  StartRuleMigrationRequestBody,
} from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';

export interface GetRuleMigrationsStatsAllParams {
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves the stats for all the existing migrations, aggregated by `migration_id`. */
export const getRuleMigrationsStatsAll = async ({
  signal,
}: GetRuleMigrationsStatsAllParams = {}): Promise<GetAllStatsRuleMigrationResponse> => {
  return KibanaServices.get().http.fetch<GetAllStatsRuleMigrationResponse>(
    SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
    { method: 'GET', version: '1', signal }
  );
};

export interface CreateRuleMigrationParams {
  /** The body containing the `connectorId` to use for the migration */
  body: CreateRuleMigrationRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Starts a new migration with the provided rules. */
export const createRuleMigration = async ({
  body,
  signal,
}: CreateRuleMigrationParams): Promise<CreateRuleMigrationResponse> => {
  return KibanaServices.get().http.post<CreateRuleMigrationResponse>(SIEM_RULE_MIGRATION_PATH, {
    body: JSON.stringify(body),
    version: '1',
    signal,
  });
};

export interface StartRuleMigrationParams {
  /** `id` of the migration to start */
  migrationId: string;
  /** The connector id to use for the migration */
  connectorId: string;
  /** Optional LangSmithOptions to use for the for the migration */
  langSmithOptions?: LangSmithOptions;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Starts a new migration with the provided rules. */
export const startRuleMigration = async ({
  migrationId,
  connectorId,
  langSmithOptions,
  signal,
}: StartRuleMigrationParams): Promise<GetAllStatsRuleMigrationResponse> => {
  const body: StartRuleMigrationRequestBody = { connector_id: connectorId };
  if (langSmithOptions) {
    body.langsmith_options = langSmithOptions;
  }
  return KibanaServices.get().http.put<GetAllStatsRuleMigrationResponse>(
    replaceParams(SIEM_RULE_MIGRATION_START_PATH, { migration_id: migrationId }),
    { body: JSON.stringify(body), version: '1', signal }
  );
};

export interface GetRuleMigrationParams {
  /** `id` of the migration to get rules documents for */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves all the migration rule documents of a specific migration. */
export const getRuleMigrations = async ({
  migrationId,
  signal,
}: GetRuleMigrationParams): Promise<GetRuleMigrationResponse> => {
  return KibanaServices.get().http.fetch<GetRuleMigrationResponse>(
    replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }),
    { method: 'GET', version: '1', signal }
  );
};

export interface InstallRulesParams {
  /** `id` of the migration to install rules for */
  migrationId: string;
  /** The rule ids to install */
  ids: string[];
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Installs the provided rule ids for a specific migration. */
export const installMigrationRules = async ({
  migrationId,
  ids,
  signal,
}: InstallRulesParams): Promise<InstallMigrationRulesResponse> => {
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

export interface InstallTranslatedRulesParams {
  /** `id` of the migration to install rules for */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Installs all the translated rules for a specific migration. */
export const installTranslatedMigrationRules = async ({
  migrationId,
  signal,
}: InstallTranslatedRulesParams): Promise<InstallTranslatedMigrationRulesResponse> => {
  return KibanaServices.get().http.fetch<InstallTranslatedMigrationRulesResponse>(
    replaceParams(SIEM_RULE_MIGRATION_INSTALL_TRANSLATED_PATH, { migration_id: migrationId }),
    {
      method: 'POST',
      version: '1',
      signal,
    }
  );
};
