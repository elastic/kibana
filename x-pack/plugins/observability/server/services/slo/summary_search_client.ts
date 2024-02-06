/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALL_VALUE, Paginated, Pagination, sloSchema } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import _ from 'lodash';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../common/slo/constants';
import { SLO, SLOId, Status, Summary } from '../../domain/models';
import { toHighPrecision } from '../../utils/number';
import { getElasticsearchQueryOrThrow } from './transform_generators';
import { isLeft } from 'fp-ts/lib/Either';

interface EsSummaryDocument {
  slo: {
    id: string;
    revision: number;
    instanceId: string;
  };
  sliValue: number;
  errorBudgetConsumed: number;
  errorBudgetRemaining: number;
  errorBudgetInitial: number;
  errorBudgetEstimated: boolean;
  statusCode: number;
  status: Status;
  isTempDoc: boolean;
}

export interface SLOSummary {
  id: SLOId;
  unsafeIsRemote: boolean;
  unsafeSlo: SLO | undefined;
  instanceId: string;
  summary: Summary;
}

export type SortField = 'error_budget_consumed' | 'error_budget_remaining' | 'sli_value' | 'status';
export interface Sort {
  field: SortField;
  direction: 'asc' | 'desc';
}

export interface SummarySearchClient {
  search(
    kqlQuery: string,
    filters: string,
    sort: Sort,
    pagination: Pagination
  ): Promise<Paginated<SLOSummary>>;
}

export class DefaultSummarySearchClient implements SummarySearchClient {
  constructor(
    private esClient: ElasticsearchClient,
    private logger: Logger,
    private spaceId: string
  ) {}

  async search(
    kqlQuery: string,
    filters: string,
    sort: Sort,
    pagination: Pagination
  ): Promise<Paginated<SLOSummary>> {
    let parsedFilters: any = {};

    try {
      parsedFilters = JSON.parse(filters);
    } catch (e) {
      this.logger.error(`Failed to parse filters: ${e.message}`);
    }

    try {
      const summarySearch = await this.esClient.search<EsSummaryDocument>({
        index: `remote_cluster:${SLO_SUMMARY_DESTINATION_INDEX_PATTERN},${SLO_SUMMARY_DESTINATION_INDEX_PATTERN}`,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              { term: { spaceId: this.spaceId } },
              getElasticsearchQueryOrThrow(kqlQuery),
              ...(parsedFilters.filter ?? []),
            ],
            must_not: [...(parsedFilters.must_not ?? [])],
          },
        },
        sort: {
          // non-temp first, then temp documents
          isTempDoc: {
            order: 'asc',
          },
          [toDocumentSortField(sort.field)]: {
            order: sort.direction,
          },
        },
        from: (pagination.page - 1) * pagination.perPage,
        size: pagination.perPage * 2, // twice as much as we return, in case they are all duplicate temp/non-temp summary
      });

      const total = (summarySearch.hits.total as SearchTotalHits).value ?? 0;
      if (total === 0) {
        return { total: 0, perPage: pagination.perPage, page: pagination.page, results: [] };
      }

      const [tempSummaryDocuments, summaryDocuments] = _.partition(
        summarySearch.hits.hits,
        (doc) => !!doc._source?.isTempDoc
      );

      // Always attempt to delete temporary summary documents with an existing non-temp summary document
      // The temp summary documents are _eventually_ removed as we get through the real summary documents
      const summarySloIds = summaryDocuments.map((doc) => doc._source?.slo.id);
      await this.esClient.deleteByQuery({
        index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
        wait_for_completion: false,
        query: {
          bool: {
            filter: [{ terms: { 'slo.id': summarySloIds } }, { term: { isTempDoc: true } }],
          },
        },
      });

      const tempSummaryDocumentsDeduped = tempSummaryDocuments.filter(
        (doc) => !summarySloIds.includes(doc._source?.slo.id)
      );

      const finalResults = summaryDocuments
        .concat(tempSummaryDocumentsDeduped)
        .slice(0, pagination.perPage);

      const finalTotal = total - (tempSummaryDocuments.length - tempSummaryDocumentsDeduped.length);
      return {
        total: finalTotal,
        perPage: pagination.perPage,
        page: pagination.page,
        results: finalResults.map((doc) => {
          const unsafeIsRemote = doc._index.includes('remote_cluster:');
          let unsafeSlo = undefined;
          if (unsafeIsRemote) {
            const res = sloSchema.decode({
              ...doc._source!.slo,
              indicator: {
                type: 'sli.kql.custom',
                params: {
                  index: 'foo',
                  good: 'good',
                  total: 'total',
                  timestampField: '@timestamp',
                },
              },
              settings: { syncDelay: '1m', frequency: '1m' },
              enabled: true,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
              version: 2,
            });

            if (isLeft(res)) {
              this.logger.error(`Invalid remote stored SLO with id [${doc._source!.slo.id}]`);
            } else {
              unsafeSlo = res.right;
            }
          }

          return {
            unsafeIsRemote,
            unsafeSlo,
            id: doc._source!.slo.id,
            instanceId: doc._source!.slo.instanceId ?? ALL_VALUE,
            summary: {
              errorBudget: {
                initial: toHighPrecision(doc._source!.errorBudgetInitial),
                consumed: toHighPrecision(doc._source!.errorBudgetConsumed),
                remaining: toHighPrecision(doc._source!.errorBudgetRemaining),
                isEstimated: doc._source!.errorBudgetEstimated,
              },
              sliValue: toHighPrecision(doc._source!.sliValue),
              status: doc._source!.status,
            },
          };
        }),
      };
    } catch (err) {
      this.logger.error(new Error('Summary search query error', { cause: err }));
      return { total: 0, perPage: pagination.perPage, page: pagination.page, results: [] };
    }
  }
}

function toDocumentSortField(field: SortField) {
  switch (field) {
    case 'error_budget_consumed':
      return 'errorBudgetConsumed';
    case 'error_budget_remaining':
      return 'errorBudgetRemaining';
    case 'status':
      return 'status';
    case 'sli_value':
      return 'sliValue';
    default:
      assertNever(field);
  }
}

/**
"slo": {
"indicator": {
  "type": "sli.apm.transactionErrorRate"
},
"timeWindow": {
  "duration": "7d",
  "type": "rolling"
},
"instanceId": "*",
"name": "API backend java Availability",
"description": "",
"id": "api-backend-java",
"groupBy": "*",
"budgetingMethod": "occurrences",
"revision": 1,
"tags": [
  "prod",
  "api"
],
"objective": {
  "target": 0.795
}
 */
