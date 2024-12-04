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
import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { getRuleMigrations } from '../api';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../../common/siem_migrations/constants';

interface UseGetMigrationRulesQueryProps {
  migrationId: string;
  page?: number;
  perPage?: number;
  searchTerm?: string;
}

export interface MigrationRulesQueryResponse {
  ruleMigrations: RuleMigration[];
  total: number;
}

export const useGetMigrationRulesQuery = (
  queryArgs: UseGetMigrationRulesQueryProps,
  queryOptions?: UseQueryOptions<
    MigrationRulesQueryResponse,
    Error,
    MigrationRulesQueryResponse,
    [...string[], UseGetMigrationRulesQueryProps]
  >
) => {
  const { migrationId } = queryArgs;
  const SPECIFIC_MIGRATION_PATH = replaceParams(SIEM_RULE_MIGRATION_PATH, {
    migration_id: migrationId,
  });
  return useQuery(
    ['GET', SPECIFIC_MIGRATION_PATH, queryArgs],
    async ({ signal }) => {
      const response = await getRuleMigrations({ signal, ...queryArgs });

      return { ruleMigrations: response.data, total: response.total };
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...queryOptions,
    }
  );
};

/**
 * We should use this hook to invalidate the rule migrations cache. For
 * example, rule migrations mutations, like installing a rule, should lead to cache invalidation.
 *
 * @returns A rule migrations cache invalidation callback
 */
export const useInvalidateGetMigrationRulesQuery = (migrationId: string) => {
  const queryClient = useQueryClient();

  const SPECIFIC_MIGRATION_PATH = replaceParams(SIEM_RULE_MIGRATION_PATH, {
    migration_id: migrationId,
  });

  return useCallback(() => {
    /**
     * Invalidate all queries that start with SPECIFIC_MIGRATION_PATH. This
     * includes the in-memory query cache and paged query cache.
     */
    queryClient.invalidateQueries(['GET', SPECIFIC_MIGRATION_PATH], {
      refetchType: 'active',
    });
  }, [SPECIFIC_MIGRATION_PATH, queryClient]);
};
