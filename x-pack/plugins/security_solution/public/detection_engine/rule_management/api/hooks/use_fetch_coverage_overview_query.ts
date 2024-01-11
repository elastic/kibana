/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import * as i18n from '../../../rule_management_ui/pages/coverage_overview/translations';
import type { CoverageOverviewFilter } from '../../../../../common/api/detection_engine';
import { RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL } from '../../../../../common/api/detection_engine';
import { fetchCoverageOverview } from '../api';
import { buildCoverageOverviewDashboardModel } from '../../logic/coverage_overview/build_coverage_overview_dashboard_model';
import type { CoverageOverviewDashboard } from '../../model/coverage_overview/dashboard';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

const COVERAGE_OVERVIEW_QUERY_KEY = ['POST', RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL];

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler.
 *
 * @param filter - coverage overview filter, see CoverageOverviewFilter type
 * @param options - react-query options
 * @returns useQuery result
 */
export const useFetchCoverageOverviewQuery = (
  filter: CoverageOverviewFilter = {},
  options?: UseQueryOptions<CoverageOverviewDashboard>
) => {
  const { addError } = useAppToasts();

  return useQuery<CoverageOverviewDashboard>(
    [...COVERAGE_OVERVIEW_QUERY_KEY, filter],
    async ({ signal }) => {
      const response = await fetchCoverageOverview({ signal, filter });

      return buildCoverageOverviewDashboardModel(response);
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
      onError: (error) => {
        addError(error, {
          title: i18n.COVERAGE_OVERVIEW_FETCH_ERROR_TITLE,
        });
      },
    }
  );
};

/**
 * We should use this hook to invalidate the coverage overview cache. For example, rule
 * mutations that affect rule set size, like creation or deletion, should lead
 * to cache invalidation.
 *
 * @returns A coverage overview cache invalidation callback
 */
export const useInvalidateFetchCoverageOverviewQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(COVERAGE_OVERVIEW_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
