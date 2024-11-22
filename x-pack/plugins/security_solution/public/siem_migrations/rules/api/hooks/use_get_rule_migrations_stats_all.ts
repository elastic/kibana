/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { getRuleMigrationsStatsAll } from '../api';
import type { GetAllStatsRuleMigrationResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATIONS_ALL_STATS_PATH } from '../../../../../common/siem_migrations/constants';

export const GET_RULE_MIGRATIONS_STATS_ALL_QUERY_KEY = ['GET', SIEM_RULE_MIGRATIONS_ALL_STATS_PATH];

export const useGetRuleMigrationsStatsAllQuery = (
  options?: UseQueryOptions<GetAllStatsRuleMigrationResponse>
) => {
  return useQuery<GetAllStatsRuleMigrationResponse>(
    GET_RULE_MIGRATIONS_STATS_ALL_QUERY_KEY,
    async ({ signal }) => {
      return getRuleMigrationsStatsAll({ signal });
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
    }
  );
};
