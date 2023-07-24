/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { assertNever } from '@kbn/std';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../assets/constants';
import { SLOId, Status, Summary } from '../../domain/models';
import { getElastichsearchQueryOrThrow } from './transform_generators';

interface EsSummaryDocument {
  slo: {
    id: string;
    revision: number;
  };
  sliValue: number;
  errorBudgetConsumed: number;
  errorBudgetRemaining: number;
  errorBudgetInitial: number;
  errorBudgetEstimated: boolean;
  statusCode: number;
  status: Status;
}

export interface Paginated<T> {
  total: number;
  page: number;
  perPage: number;
  results: T[];
}

export interface SLOSummary {
  id: SLOId;
  summary: Summary;
}

export type SortField = 'error_budget_consumed' | 'error_budget_remaining' | 'sli_value' | 'status';
export interface Sort {
  field: SortField;
  direction: 'asc' | 'desc';
}

export interface Pagination {
  page: number;
  perPage: number;
}

export interface SummarySearchClient {
  search(kqlQuery: string, sort: Sort, pagination: Pagination): Promise<Paginated<SLOSummary>>;
}

export class DefaultSummarySearchClient implements SummarySearchClient {
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  async search(
    kqlQuery: string,
    sort: Sort,
    pagination: Pagination
  ): Promise<Paginated<SLOSummary>> {
    try {
      const result = await this.esClient.search<EsSummaryDocument>({
        index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
        query: getElastichsearchQueryOrThrow(kqlQuery),
        sort: {
          [toDocumentSortField(sort.field)]: {
            order: sort.direction,
          },
        },
        from: (pagination.page - 1) * pagination.perPage,
        size: pagination.perPage,
      });

      const total =
        typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value;

      if (total === undefined || total === 0) {
        return { total: 0, perPage: pagination.perPage, page: pagination.page, results: [] };
      }

      return {
        total,
        perPage: pagination.perPage,
        page: pagination.page,
        results: result.hits.hits.map((doc) => ({
          id: doc._source!.slo.id,
          summary: {
            errorBudget: {
              initial: doc._source!.errorBudgetInitial,
              consumed: doc._source!.errorBudgetConsumed,
              remaining: doc._source!.errorBudgetRemaining,
              isEstimated: doc._source!.errorBudgetEstimated,
            },
            sliValue: doc._source!.sliValue,
            status: doc._source!.status,
          },
        })),
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
