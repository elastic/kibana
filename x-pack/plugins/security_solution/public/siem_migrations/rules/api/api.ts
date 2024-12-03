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
  SIEM_RULE_MIGRATIONS_PATH,
  SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
  SIEM_RULE_MIGRATION_INSTALL_TRANSLATED_PATH,
  SIEM_RULE_MIGRATION_INSTALL_PATH,
  SIEM_RULE_MIGRATION_PATH,
  SIEM_RULE_MIGRATION_START_PATH,
  SIEM_RULE_MIGRATION_STATS_PATH,
  SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH,
  SIEM_RULE_MIGRATION_CREATE_PATH,
} from '../../../../common/siem_migrations/constants';
import type {
  CreateRuleMigrationRequestBody,
  CreateRuleMigrationResponse,
  GetAllStatsRuleMigrationResponse,
  GetRuleMigrationResponse,
  GetRuleMigrationTranslationStatsResponse,
  InstallTranslatedMigrationRulesResponse,
  InstallMigrationRulesResponse,
  StartRuleMigrationRequestBody,
  GetRuleMigrationStatsResponse,
} from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';

export interface GetRuleMigrationsStatsParams {
  /** `id` of the migration to get stats for */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves the stats for all the existing migrations, aggregated by `migration_id`. */
export const getRuleMigrationsStats = async ({
  migrationId,
  signal,
}: GetRuleMigrationsStatsParams): Promise<GetRuleMigrationStatsResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationStatsResponse>(
    replaceParams(SIEM_RULE_MIGRATION_STATS_PATH, { migration_id: migrationId }),
    { version: '1', signal }
  );
};

export interface GetRuleMigrationsStatsAllParams {
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves the stats for all the existing migrations, aggregated by `migration_id`. */
export const getRuleMigrationsStatsAll = async ({
  signal,
}: GetRuleMigrationsStatsAllParams = {}): Promise<GetAllStatsRuleMigrationResponse> => {
  return KibanaServices.get().http.get<GetAllStatsRuleMigrationResponse>(
    SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
    { version: '1', signal }
  );
};

export interface CreateRuleMigrationParams {
  /** Optional `id` of migration to add the rules to.
   * The id is necessary only for batching the migration creation in multiple requests */
  migrationId?: string;
  /** The body containing the `connectorId` to use for the migration */
  body: CreateRuleMigrationRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Starts a new migration with the provided rules. */
export const createRuleMigration = async ({
  migrationId,
  body,
  signal,
}: CreateRuleMigrationParams): Promise<CreateRuleMigrationResponse> => {
  return KibanaServices.get().http.post<CreateRuleMigrationResponse>(
    `${SIEM_RULE_MIGRATIONS_PATH}${migrationId ? `/${migrationId}` : ''}`,
    { body: JSON.stringify(body), version: '1', signal }
  );
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
  /** Optional page number to retrieve */
  page?: number;
  /** Optional number of documents per page to retrieve */
  perPage?: number;
  /** Optional search term to filter documents */
  searchTerm?: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves all the migration rule documents of a specific migration. */
export const getRuleMigrations = async ({
  migrationId,
  page,
  perPage,
  searchTerm,
  signal,
}: GetRuleMigrationParams): Promise<GetRuleMigrationResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationResponse>(
    replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }),
    { version: '1', query: { page, per_page: perPage, search_term: searchTerm }, signal }
  );
};

export interface GetRuleMigrationTranslationStatsParams {
  /** `id` of the migration to get translation stats for */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/**
 * Retrieves the translation stats for the migration.
 */
export const getRuleMigrationTranslationStats = async ({
  migrationId,
  signal,
}: GetRuleMigrationTranslationStatsParams): Promise<GetRuleMigrationTranslationStatsResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationTranslationStatsResponse>(
    replaceParams(SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH, { migration_id: migrationId }),
    { version: '1', signal }
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
  return KibanaServices.get().http.post<InstallMigrationRulesResponse>(
    replaceParams(SIEM_RULE_MIGRATION_INSTALL_PATH, { migration_id: migrationId }),
    { version: '1', body: JSON.stringify(ids), signal }
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
  return KibanaServices.get().http.post<InstallTranslatedMigrationRulesResponse>(
    replaceParams(SIEM_RULE_MIGRATION_INSTALL_TRANSLATED_PATH, { migration_id: migrationId }),
    { version: '1', signal }
  );
};
