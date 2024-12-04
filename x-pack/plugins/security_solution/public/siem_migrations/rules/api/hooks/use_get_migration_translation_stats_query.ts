/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { replaceParams } from '@kbn/openapi-common/shared';
import { useCallback } from 'react';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { getRuleMigrationTranslationStats } from '../api';
import type { GetRuleMigrationTranslationStatsResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH } from '../../../../../common/siem_migrations/constants';

export const useGetMigrationTranslationStatsQuery = (
  migrationId: string,
  options?: UseQueryOptions<GetRuleMigrationTranslationStatsResponse>
) => {
  const SPECIFIC_MIGRATION_TRANSLATION_PATH = replaceParams(
    SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH,
    {
      migration_id: migrationId,
    }
  );
  return useQuery<GetRuleMigrationTranslationStatsResponse>(
    ['GET', SPECIFIC_MIGRATION_TRANSLATION_PATH],
    async ({ signal }) => {
      return getRuleMigrationTranslationStats({ migrationId, signal });
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
    }
  );
};

/**
 * We should use this hook to invalidate the translation stats cache. For
 * example, rule migrations mutations, like installing a rule, should lead to cache invalidation.
 *
 * @returns A translation stats cache invalidation callback
 */
export const useInvalidateGetMigrationTranslationStatsQuery = (migrationId: string) => {
  const queryClient = useQueryClient();

  const SPECIFIC_MIGRATION_TRANSLATION_PATH = replaceParams(
    SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH,
    {
      migration_id: migrationId,
    }
  );

  return useCallback(() => {
    queryClient.invalidateQueries(['GET', SPECIFIC_MIGRATION_TRANSLATION_PATH], {
      refetchType: 'active',
    });
  }, [SPECIFIC_MIGRATION_TRANSLATION_PATH, queryClient]);
};
