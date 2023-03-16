/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type { Pagination } from '@elastic/eui';
import {
  AggregationsCardinalityAggregate,
  AggregationsMultiBucketAggregateBase,
  AggregationsMultiBucketBase,
  AggregationsScriptedMetricAggregate,
  AggregationsStringRareTermsBucketKeys,
  AggregationsStringTermsBucketKeys,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { getBelongsToRuntimeMapping } from '../../../../common/runtime_mappings/get_belongs_to_runtime_mapping';
import { MAX_FINDINGS_TO_LOAD } from '../../../common/constants';
import { useKibana } from '../../../common/hooks/use_kibana';
import { showErrorToast } from '../latest_findings/use_latest_findings';
import type { FindingsBaseEsQuery, Sort } from '../types';
import { getAggregationCount, getFindingsCountAggQuery } from '../utils/utils';
import { CSP_LATEST_FINDINGS_DATA_VIEW } from '../../../../common/constants';

interface UseFindingsByResourceOptions extends FindingsBaseEsQuery {
  enabled: boolean;
  sortDirection: Sort<unknown>['direction'];
}

// Maximum number of grouped findings, default limit in elasticsearch is set to 65,536 (ref: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-settings.html#search-settings-max-buckets)
const MAX_BUCKETS = 60 * 1000;

export interface FindingsByResourceQuery {
  pageIndex: Pagination['pageIndex'];
  sortDirection: Sort<unknown>['direction'];
}

type FindingsAggRequest = IKibanaSearchRequest<SearchRequest>;
type FindingsAggResponse = IKibanaSearchResponse<SearchResponse<{}, FindingsByResourceAggs>>;

export interface FindingsByResourcePage {
  findings: {
    failed_findings: number;
    passed_findings: number;
    normalized: number;
    total_findings: number;
  };
  compliance_score: number;
  resource_id?: string;
  belongs_to?: string;
  'resource.name'?: string;
  'resource.sub_type'?: string;
  'rule.benchmark.name'?: string;
  'rule.section'?: string[];
}

interface FindingsByResourceAggs {
  resource_total: AggregationsCardinalityAggregate;
  resources: AggregationsMultiBucketAggregateBase<FindingsAggBucket>;
  count: AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucketKeys>;
}

interface FindingsAggBucket extends AggregationsStringRareTermsBucketKeys {
  failed_findings: AggregationsMultiBucketBase;
  compliance_score: AggregationsScriptedMetricAggregate;
  passed_findings: AggregationsMultiBucketBase;
  name: AggregationsMultiBucketAggregateBase<AggregationsStringTermsBucketKeys>;
  subtype: AggregationsMultiBucketAggregateBase<AggregationsStringTermsBucketKeys>;
  belongs_to: AggregationsMultiBucketAggregateBase<AggregationsStringTermsBucketKeys>;
  benchmarkName: AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucketKeys>;
  cis_sections: AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucketKeys>;
}

export const getFindingsByResourceAggQuery = ({
  query,
  sortDirection,
}: UseFindingsByResourceOptions): SearchRequest => ({
  index: CSP_LATEST_FINDINGS_DATA_VIEW,
  query,
  size: 0,
  runtime_mappings: getBelongsToRuntimeMapping(),
  aggs: {
    ...getFindingsCountAggQuery(),
    resource_total: { cardinality: { field: 'resource.id' } },
    resources: {
      terms: { field: 'resource.id', size: MAX_BUCKETS },
      aggs: {
        name: {
          terms: { field: 'resource.name', size: 1 },
        },
        subtype: {
          terms: { field: 'resource.sub_type', size: 1 },
        },
        benchmarkName: {
          terms: { field: 'rule.benchmark.name' },
        },
        cis_sections: {
          terms: { field: 'rule.section' },
        },
        failed_findings: {
          filter: { term: { 'result.evaluation': 'failed' } },
        },
        passed_findings: {
          filter: { term: { 'result.evaluation': 'passed' } },
        },
        // this field is runtime generated
        belongs_to: {
          terms: { field: 'belongs_to', size: 1 },
        },
        compliance_score: {
          bucket_script: {
            buckets_path: {
              passed: 'passed_findings>_count',
              failed: 'failed_findings>_count',
            },
            script: 'params.passed / (params.passed + params.failed)',
          },
        },
        sort_by_compliance_score: {
          bucket_sort: {
            size: MAX_FINDINGS_TO_LOAD,
            sort: [
              {
                compliance_score: { order: sortDirection },
                _count: { order: 'desc' },
                _key: { order: 'asc' },
              },
            ],
          },
        },
      },
    },
  },
  ignore_unavailable: false,
});

const getFirstKey = (
  buckets: AggregationsMultiBucketAggregateBase<AggregationsStringTermsBucketKeys>['buckets']
): undefined | string => {
  if (!!Array.isArray(buckets) && !!buckets.length) return buckets[0].key;
};

const getKeysList = (
  buckets: AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucketKeys>['buckets']
): undefined | string[] => {
  if (!!Array.isArray(buckets) && !!buckets.length) return buckets.map((v) => v.key);
};

const createFindingsByResource = (resource: FindingsAggBucket): FindingsByResourcePage => ({
  resource_id: resource.key,
  ['resource.name']: getFirstKey(resource.name.buckets),
  ['resource.sub_type']: getFirstKey(resource.subtype.buckets),
  ['rule.section']: getKeysList(resource.cis_sections.buckets),
  ['rule.benchmark.name']: getFirstKey(resource.benchmarkName.buckets),
  belongs_to: getFirstKey(resource.belongs_to.buckets),
  compliance_score: resource.compliance_score.value,
  findings: {
    failed_findings: resource.failed_findings.doc_count,
    normalized:
      resource.doc_count > 0 ? resource.failed_findings.doc_count / resource.doc_count : 0,
    total_findings: resource.doc_count,
    passed_findings: resource.passed_findings.doc_count,
  },
});

export const useFindingsByResource = (options: UseFindingsByResourceOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  const params = { ...options };

  return useQuery(
    ['csp_findings_resource', { params }],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<FindingsAggRequest, FindingsAggResponse>({
          params: getFindingsByResourceAggQuery(params),
        })
      );

      if (!aggregations) throw new Error('Failed to aggregate by, missing resource id');

      if (
        !Array.isArray(aggregations.resources.buckets) ||
        !Array.isArray(aggregations.count.buckets)
      )
        throw new Error('Failed to group by, missing resource id');

      const page = aggregations.resources.buckets.map(createFindingsByResource);

      return {
        page,
        total: aggregations.resource_total.value,
        count: getAggregationCount(aggregations.count.buckets),
      };
    },
    {
      enabled: options.enabled,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
