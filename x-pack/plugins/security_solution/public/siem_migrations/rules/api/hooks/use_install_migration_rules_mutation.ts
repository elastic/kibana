/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { InstallMigrationRulesResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATION_INSTALL_PATH } from '../../../../../common/siem_migrations/constants';
import { installMigrationRules } from '../api';
import { useInvalidateGetMigrationRulesQuery } from './use_get_migration_rules_query';
import { useInvalidateGetMigrationTranslationStatsQuery } from './use_get_migration_translation_stats_query';

export const INSTALL_MIGRATION_RULES_MUTATION_KEY = ['POST', SIEM_RULE_MIGRATION_INSTALL_PATH];

export const useInstallMigrationRulesMutation = (
  migrationId: string,
  options?: UseMutationOptions<InstallMigrationRulesResponse, Error, string[]>
) => {
  const invalidateGetRuleMigrationsQuery = useInvalidateGetMigrationRulesQuery(migrationId);
  const invalidateGetMigrationTranslationStatsQuery =
    useInvalidateGetMigrationTranslationStatsQuery(migrationId);

  return useMutation<InstallMigrationRulesResponse, Error, string[]>(
    (ids: string[]) => installMigrationRules({ migrationId, ids }),
    {
      ...options,
      mutationKey: INSTALL_MIGRATION_RULES_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateGetRuleMigrationsQuery();
        invalidateGetMigrationTranslationStatsQuery();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
