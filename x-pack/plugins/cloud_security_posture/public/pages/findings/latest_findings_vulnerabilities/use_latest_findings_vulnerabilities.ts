/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { number } from 'io-ts';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import type { Pagination } from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { extractErrorMessage } from '../../../../common/utils/helpers';
import type { Sort } from '../types';
import { useKibana } from '../../../common/hooks/use_kibana';
import type { FindingsBaseEsQuery } from '../types';
import { getAggregationCount, getFindingsCountAggQuery } from '../utils/utils';
import { CSP_LATEST_FINDINGS_DATA_VIEW } from '../../../../common/constants';
import { MAX_FINDINGS_TO_LOAD } from '../../../common/constants';

interface UseFindingsOptions extends FindingsBaseEsQuery {
  sort: Sort<CspFinding>;
  enabled: boolean;
}

export interface FindingsGroupByNoneQuery {
  pageIndex: Pagination['pageIndex'];
  sort: Sort<CspFinding>;
}

type LatestFindingsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<
  estypes.SearchResponse<CspFinding, FindingsAggs>
>;

interface FindingsAggs {
  count: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

const SEARCH_FAILED_TEXT = i18n.translate(
  'xpack.csp.findings.findingsErrorToast.searchFailedTitle',
  { defaultMessage: 'Search failed' }
);

export const showErrorToast = (
  toasts: CoreStart['notifications']['toasts'],
  error: unknown
): void => {
  if (error instanceof Error) toasts.addError(error, { title: SEARCH_FAILED_TEXT });
  else toasts.addDanger(extractErrorMessage(error, SEARCH_FAILED_TEXT));
};

export const getFindingsVulnerabilitiesQuery = ({ query, sort }: UseFindingsOptions) => ({
  index: '.internal.alerts*',
  body: {
    query,
    // sort: [{ [sort.field]: sort.direction }],
    size: MAX_FINDINGS_TO_LOAD,
    aggs: {
      cves: {
        nested: {
          path: 'threat.enrichments',
        },
        aggs: {
          cves: {
            terms: {
              field: 'threat.enrichments.indicator.epss.vulnerability.id',
            },
            aggs: {
              cve_data: {
                reverse_nested: {},
                aggs: {
                  resources_count: {
                    cardinality: {
                      field: 'agent.id',
                    },
                  },
                  alerts: {
                    top_hits: {
                      size: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  ignore_unavailable: false,
});

export const useLatestFindingsVulnerabilities = (options: UseFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;
  return useQuery(
    ['csp_findings_vulnerabilities', { params: options }],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: getFindingsVulnerabilitiesQuery(options),
        })
      );
      // if (!aggregations) throw new Error('expected aggregations to be an defined');
      // if (!Array.isArray(aggregations.count.buckets))
      //   throw new Error('expected buckets to be an array');

      console.error('aggs', aggregations);

      return {
        page: aggregations?.cves.cves.buckets,
        total: aggregations?.cves.cves.buckets.length,
        count: aggregations?.cves.cves.buckets.length,
        // page: hits.hits.map((hit) => hit._source!),
        // total: number.is(hits.total) ? hits.total : 0,
        // count: getAggregationCount(aggregations.count.buckets),
      };
    },
    {
      enabled: options.enabled,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
