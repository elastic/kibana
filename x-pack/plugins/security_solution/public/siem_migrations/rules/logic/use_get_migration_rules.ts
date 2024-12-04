/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { replaceParams } from '@kbn/openapi-common/shared';
import { useCallback } from 'react';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../common/siem_migrations/constants';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { getRuleMigrations } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

export const useGetMigrationRules = (params: {
  migrationId: string;
  page?: number;
  perPage?: number;
  searchTerm?: string;
}) => {
  const { addError } = useAppToasts();

  const { migrationId } = params;
  const SPECIFIC_MIGRATION_PATH = replaceParams(SIEM_RULE_MIGRATION_PATH, {
    migration_id: migrationId,
  });

  return useQuery(
    ['GET', SPECIFIC_MIGRATION_PATH, params],
    async ({ signal }) => {
      const response = await getRuleMigrations({ signal, ...params });

      return { ruleMigrations: response.data, total: response.total };
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.GET_MIGRATION_RULES_FAILURE });
      },
    }
  );
};

/**
 * We should use this hook to invalidate the rule migrations cache. For
 * example, rule migrations mutations, like installing a rule, should lead to cache invalidation.
 *
 * @returns A rule migrations cache invalidation callback
 */
export const useInvalidateGetMigrationRules = (migrationId: string) => {
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
