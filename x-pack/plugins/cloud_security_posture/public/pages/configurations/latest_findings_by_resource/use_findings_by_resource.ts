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
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { getBelongsToRuntimeMapping } from '../../../../common/runtime_mappings/get_belongs_to_runtime_mapping';
import { MAX_FINDINGS_TO_LOAD } from '../../../common/constants';
import { useKibana } from '../../../common/hooks/use_kibana';
import { showErrorToast } from '../../../common/utils/show_error_toast';
import type { FindingsBaseEsQuery, Sort } from '../../../common/types';
import { getFindingsCountAggQuery, getFindingsTimeRangeQuery } from '../utils/utils';
import { FINDINGS_INDEX_PATTERN } from '../../../../common/constants';

interface UseFindingsByResourceOptions extends FindingsBaseEsQuery {
  enabled: boolean;
  sortDirection: Sort<unknown>['direction'];
}

// Maximum number of grouped findings, default limit in elasticsearch is set to 65,536 (ref: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-settings.html#search-settings-max-buckets)
const MAX_BUCKETS = 60 * 1000;

export interface FindingsByResourceQuery {
  pageIndex: Pagination['pageIndex'];
  sort: Sort<CspFinding>;
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
  index: FINDINGS_INDEX_PATTERN,
  query: getFindingsTimeRangeQuery(query),
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
        // this field is runtime generated
        belongs_to: {
          terms: { field: 'belongs_to', size: 1 },
        },
        unique_event_code: {
          terms: {
            field: 'event.code',
            size: 65000,
          },
          aggs: {
            latest_result_evaluation: {
              top_hits: {
                _source: ['result.evaluation'],
                size: 1,
                sort: [{ '@timestamp': 'desc' }],
              },
            },
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

const createFindingsByResource = (resource: FindingsAggBucket): FindingsByResourcePage => {
  let totalPassed = 0;
  let totalFailed = 0;
  let findingsBucketsLength = resource.unique_event_code.buckets.length;

  for (let i = 0; i < findingsBucketsLength; i++) {
    const evaluationBucket = resource.unique_event_code.buckets[i];
    const latestResultEvaluation =
      evaluationBucket.latest_result_evaluation.hits.hits[0]._source.result.evaluation;
    totalPassed += latestResultEvaluation === 'passed' ? 1 : 0;
    totalFailed += latestResultEvaluation === 'failed' ? 1 : 0;
  }

  const totalFindings = totalPassed + totalFailed;

  return {
    resource_id: resource.key,
    ['resource.name']: getFirstKey(resource.name.buckets),
    ['resource.sub_type']: getFirstKey(resource.subtype.buckets),
    ['rule.section']: getKeysList(resource.cis_sections.buckets),
    ['rule.benchmark.name']: getFirstKey(resource.benchmarkName.buckets),
    belongs_to: getFirstKey(resource.belongs_to.buckets),
    compliance_score: totalFindings > 0 ? totalFailed / totalFindings : 0,
    findings: {
      failed_findings: totalFailed,
      normalized: totalFindings > 0 ? totalFailed / totalFindings : 0,
      total_findings: totalFindings,
      passed_findings: totalPassed,
    },
  };
};

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

      if (!Array.isArray(aggregations.resources.buckets))
        throw new Error('Failed to group by, missing resource id');

      const page = aggregations.resources.buckets.map(createFindingsByResource);

      let totalPassed = 0;
      let totalFailed = 0;
      let findingsBucketsLength = aggregations.unique_event_code.buckets.length;

      for (let i = 0; i < findingsBucketsLength; i++) {
        const evaluationBucket = aggregations.unique_event_code.buckets[i];
        const latestResultEvaluation =
          evaluationBucket.latest_result_evaluation.hits.hits[0]._source.result.evaluation;
        totalPassed += latestResultEvaluation === 'passed' ? 1 : 0;
        totalFailed += latestResultEvaluation === 'failed' ? 1 : 0;
      }

      return {
        page,
        total: aggregations.resource_total.value,
        count: {
          failed: totalFailed,
          passed: totalPassed,
        },
      };
    },
    {
      enabled: options.enabled,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
