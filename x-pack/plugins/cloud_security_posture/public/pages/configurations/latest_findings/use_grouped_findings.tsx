/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IKibanaSearchResponse } from '@kbn/data-plugin/public';
import { GroupingAggregation } from '@kbn/securitysolution-grouping';
import { GenericBuckets } from '@kbn/securitysolution-grouping/src';
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { CSP_LATEST_FINDINGS_DATA_VIEW } from '../../../../common/constants';
import { useKibana } from '../../../common/hooks/use_kibana';
import { showErrorToast } from '../../../common/utils/show_error_toast';

// Elasticsearch returns `null` when a sub-aggregation cannot be computed
type NumberOrNull = number | null;

export interface FindingsGroupingAggregation {
  unitsCount?: {
    value?: NumberOrNull;
  };
  description?: {
    buckets?: GenericBuckets[];
  };
  severitiesSubAggregation?: {
    buckets?: GenericBuckets[];
  };
  countSeveritySubAggregation?: {
    value?: NumberOrNull;
  };
  usersCountAggregation?: {
    value?: NumberOrNull;
  };
  hostsCountAggregation?: {
    value?: NumberOrNull;
  };
  ipsCountAggregation?: {
    value?: NumberOrNull;
  };
  rulesCountAggregation?: {
    value?: NumberOrNull;
  };
  ruleTags?: {
    doc_count_error_upper_bound?: number;
    sum_other_doc_count?: number;
    buckets?: GenericBuckets[];
  };
  stackByMultipleFields1?: {
    buckets?: GenericBuckets[];
    doc_count_error_upper_bound?: number;
    sum_other_doc_count?: number;
  };
}

export const getGroupedFindingsQuery = (query: any) => ({
  index: CSP_LATEST_FINDINGS_DATA_VIEW,
  ...query,
});

export const useGroupedFindings = ({ query, enabled = true }: any) => {
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
          IKibanaSearchResponse<
            SearchResponse<{}, GroupingAggregation<FindingsGroupingAggregation>>
          >
        >({
          params: getGroupedFindingsQuery(query),
        })
      );

      if (!aggregations) throw new Error('Failed to aggregate by, missing resource id');

      // if (
      //   !Array.isArray(aggregations.resources.buckets) ||
      //   !Array.isArray(aggregations.count.buckets)
      // )
      //   throw new Error('Failed to group by, missing resource id');

      // const page = aggregations.resources.buckets.map(createFindingsByResource);

      // const aggs = parseGroupingQuery(
      //   // fallback to selectedGroup if queriedGroup.current is null, this happens in tests
      //   queriedGroup.current === null ? selectedGroup : queriedGroup.current,
      //   uniqueValue,
      //   alertsGroupsData?.aggregations
      // );

      return aggregations;
      // return {
      //   ...aggregations,
      //   groupByFields: {
      //     ...aggregations.groupByFields,
      //     buckets: [
      //       ...aggregations.groupByFields.buckets.map((bucket) => ({
      //         ...bucket,
      //         unitsCount: {
      //           value: 2,
      //         },
      //         selectedGroup: 'resource.id',
      //         key_as_string: 'Vulnerability: CVE-2022-28734',
      //         key: ['Vulnerability: CVE-2022-28734'],
      //       })),
      //     ],
      //   },
      // };
    },
    {
      onError: (err: Error) => showErrorToast(toasts, err),
      enabled,
    }
  );
};
