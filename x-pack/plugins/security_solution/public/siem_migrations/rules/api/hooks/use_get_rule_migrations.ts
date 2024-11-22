/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { replaceParams } from '@kbn/openapi-common/shared';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { getRuleMigrations } from '../api';
import type { GetRuleMigrationResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../../common/siem_migrations/constants';

export const useGetRuleMigrationsQuery = (
  migrationId: string,
  options?: UseQueryOptions<GetRuleMigrationResponse>
) => {
  const SPECIFIC_MIGRATION_PATH = replaceParams(SIEM_RULE_MIGRATION_PATH, {
    migration_id: migrationId,
  });
  return useQuery<GetRuleMigrationResponse>(
    ['GET', SPECIFIC_MIGRATION_PATH],
    async ({ signal }) => {
      return getRuleMigrations({ migrationId, signal });
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
    }
  );
};
