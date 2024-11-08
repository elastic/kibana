/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { GenericBuckets, GroupingQuery, RootAggregation } from '@kbn/grouping/src';
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { CDR_MISCONFIGURATIONS_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import { showErrorToast } from '@kbn/cloud-security-posture';
import { useKibana } from '../../../common/hooks/use_kibana';

// Elasticsearch returns `null` when a sub-aggregation cannot be computed
type NumberOrNull = number | null;

export interface FindingsRootGroupingAggregation
  extends RootAggregation<FindingsGroupingAggregation> {
  failedFindings?: {
    doc_count?: NumberOrNull;
  };
  passedFindings?: {
    doc_count?: NumberOrNull;
  };
}

export interface FindingsGroupingAggregation {
  unitsCount?: {
    value?: NumberOrNull;
  };
  groupsCount?: {
    value?: NumberOrNull;
  };
  failedFindings?: {
    doc_count?: NumberOrNull;
  };
  passedFindings?: {
    doc_count?: NumberOrNull;
  };
  groupByFields?: {
    buckets?: GenericBuckets[];
  };
  description?: {
    buckets?: GenericBuckets[];
  };
  resourceName?: {
    buckets?: GenericBuckets[];
  };
  resourceSubType?: {
    buckets?: GenericBuckets[];
  };
  benchmarkName?: {
    buckets?: GenericBuckets[];
  };
  benchmarkVersion?: {
    buckets?: GenericBuckets[];
  };
  benchmarkId?: {
    buckets?: GenericBuckets[];
  };
  isLoading?: boolean;
}

export const getGroupedFindingsQuery = (query: GroupingQuery) => ({
  ...query,
  index: CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  ignore_unavailable: true,
  size: 0,
});

export const useGroupedFindings = ({
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
    ['csp_grouped_findings', { query }],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<
          {},
          IKibanaSearchResponse<SearchResponse<{}, FindingsRootGroupingAggregation>>
        >({
          params: getGroupedFindingsQuery(query),
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
