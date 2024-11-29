/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { InstallTranslatedMigrationRulesResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATION_INSTALL_TRANSLATED_PATH } from '../../../../../common/siem_migrations/constants';
import { installTranslatedMigrationRules } from '../api';
import { useInvalidateGetMigrationRulesQuery } from './use_get_migration_rules_query';

export const INSTALL_ALL_MIGRATION_RULES_MUTATION_KEY = [
  'POST',
  SIEM_RULE_MIGRATION_INSTALL_TRANSLATED_PATH,
];

export const useInstallAllMigrationRulesMutation = (
  migrationId: string,
  options?: UseMutationOptions<InstallTranslatedMigrationRulesResponse, Error>
) => {
  const invalidateGetRuleMigrationsQuery = useInvalidateGetMigrationRulesQuery(migrationId);

  return useMutation<InstallTranslatedMigrationRulesResponse, Error>(
    () => installTranslatedMigrationRules({ migrationId }),
    {
      ...options,
      mutationKey: INSTALL_ALL_MIGRATION_RULES_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateGetRuleMigrationsQuery();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
