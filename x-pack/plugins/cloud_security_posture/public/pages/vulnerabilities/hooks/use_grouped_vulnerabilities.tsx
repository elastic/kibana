/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { GenericBuckets, GroupingQuery, RootAggregation } from '@kbn/securitysolution-grouping/src';
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { LATEST_VULNERABILITIES_INDEX_PATTERN } from '../../../../common/constants';
import { useKibana } from '../../../common/hooks/use_kibana';
import { showErrorToast } from '../../../common/utils/show_error_toast';

// Elasticsearch returns `null` when a sub-aggregation cannot be computed
type NumberOrNull = number | null;

export interface VulnerabilitiesGroupingAggregation {
  unitsCount?: {
    value?: NumberOrNull;
  };
  groupsCount?: {
    value?: NumberOrNull;
  };
  groupByFields?: {
    buckets?: GenericBuckets[];
  };
  description?: {
    buckets?: GenericBuckets[];
  };
  resourceId?: {
    buckets?: GenericBuckets[];
  };
  isLoading?: boolean;
  critical?: {
    doc_count?: NumberOrNull;
  };
  high?: {
    doc_count?: NumberOrNull;
  };
  medium?: {
    doc_count?: NumberOrNull;
  };
  low?: {
    doc_count?: NumberOrNull;
  };
  cloudProvider?: {
    buckets?: GenericBuckets[];
  };
}

export type VulnerabilitiesRootGroupingAggregation =
  RootAggregation<VulnerabilitiesGroupingAggregation>;

export const getGroupedVulnerabilitiesQuery = (query: GroupingQuery) => ({
  ...query,
  index: LATEST_VULNERABILITIES_INDEX_PATTERN,
  size: 0,
});

export const useGroupedVulnerabilities = ({
  query,
  enabled = true,
}: {
  query: GroupingQuery;
  enabled: boolean;
}) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery(
    ['csp_grouped_vulnerabilities', { query }],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<
          {},
          IKibanaSearchResponse<SearchResponse<{}, VulnerabilitiesRootGroupingAggregation>>
        >({
          params: getGroupedVulnerabilitiesQuery(query),
        })
      );

      if (!aggregations) throw new Error('Failed to aggregate by, missing resource id');

      return aggregations;
    },
    {
      onError: (err: Error) => showErrorToast(toasts, err),
      enabled,
      // This allows the UI to keep the previous data while the new data is being fetched
      keepPreviousData: true,
    }
  );
};
