/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { ALL_VALUE, Paginated, Pagination } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import { partition } from 'lodash';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { Groupings, SLODefinition, SLOId, Summary } from '../domain/models';
import { toHighPrecision } from '../utils/number';
import { createEsParams, typedSearch } from '../utils/queries';
import { getListOfSummaryIndices } from './slo_settings';
import { EsSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { getElasticsearchQueryOrThrow } from './transform_generators';
import { fromRemoteSummaryDocumentToSloDefinition } from './unsafe_federated/remote_summary_doc_to_slo';
import { getFlattenedGroupings } from './utils';

export type SummaryResult = {
  sloId: SLOId;
  instanceId: string;
  summary: Summary;
  groupings: Groupings;
  remote?: {
    kibanaUrl: string;
    remoteName: string;
    slo: SLODefinition;
  };
};

type SortField = 'error_budget_consumed' | 'error_budget_remaining' | 'sli_value' | 'status';

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
  ): Promise<Paginated<SummaryResult>>;
}

export class DefaultSummarySearchClient implements SummarySearchClient {
  constructor(
    private esClient: ElasticsearchClient,
    private soClient: SavedObjectsClientContract,
    private logger: Logger,
    private spaceId: string
  ) {}

  async search(
    kqlQuery: string,
    filters: string,
    sort: Sort,
    pagination: Pagination
  ): Promise<Paginated<SummaryResult>> {
    let parsedFilters: any = {};

    try {
      parsedFilters = JSON.parse(filters);
    } catch (e) {
      this.logger.error(`Failed to parse filters: ${e.message}`);
    }

    const indices = await getListOfSummaryIndices(this.soClient, this.esClient);
    const esParams = createEsParams({
      index: indices,
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

    try {
      const summarySearch = await typedSearch<EsSummaryDocument, typeof esParams>(
        this.esClient,
        esParams
      );

      const total = (summarySearch.hits.total as SearchTotalHits).value ?? 0;
      if (total === 0) {
        return { total: 0, perPage: pagination.perPage, page: pagination.page, results: [] };
      }

      const [tempSummaryDocuments, summaryDocuments] = partition(
        summarySearch.hits.hits,
        (doc) => !!doc._source?.isTempDoc
      );

      // TODO filter out remote summary documents from the deletion of outdated summaries
      const summarySloIds = summaryDocuments.map((doc) => doc._source.slo.id);
      await this.deleteOutdatedTemporarySummaries(summarySloIds);

      const tempSummaryDocumentsDeduped = tempSummaryDocuments.filter(
        (doc) => !summarySloIds.includes(doc._source.slo.id)
      );

      const finalResults = summaryDocuments
        .concat(tempSummaryDocumentsDeduped)
        .slice(0, pagination.perPage);

      const finalTotal = total - (tempSummaryDocuments.length - tempSummaryDocumentsDeduped.length);

      return {
        ...pagination,
        total: finalTotal,
        results: finalResults.map((doc) => {
          const summaryDoc = doc._source;
          const remoteName = getRemoteClusterName(doc._index);
          const isRemote = !!remoteName;
          let remoteSloDefinition;
          if (isRemote) {
            remoteSloDefinition = fromRemoteSummaryDocumentToSloDefinition(summaryDoc, this.logger);
          }

          return {
            ...(isRemote &&
              !!remoteSloDefinition && {
                remote: {
                  kibanaUrl: summaryDoc.kibanaUrl!,
                  remoteName: remoteName,
                  slo: remoteSloDefinition,
                },
              }),
            sloId: summaryDoc.slo.id,
            instanceId: summaryDoc.slo.instanceId ?? ALL_VALUE,
            summary: {
              errorBudget: {
                initial: toHighPrecision(summaryDoc.errorBudgetInitial),
                consumed: toHighPrecision(summaryDoc.errorBudgetConsumed),
                remaining: toHighPrecision(summaryDoc.errorBudgetRemaining),
                isEstimated: summaryDoc.errorBudgetEstimated,
              },
              sliValue: toHighPrecision(doc._source.sliValue),
              status: summaryDoc.status,
            },
            groupings: getFlattenedGroupings({
              groupings: summaryDoc.slo.groupings,
              groupBy: summaryDoc.slo.groupBy,
            }),
          };
        }),
      };
    } catch (err) {
      this.logger.error(new Error(`Summary search query error, ${err.message}`, { cause: err }));
      return { total: 0, perPage: pagination.perPage, page: pagination.page, results: [] };
    }
  }

  private async deleteOutdatedTemporarySummaries(summarySloIds: string[]) {
    // Always attempt to delete temporary summary documents with an existing non-temp summary document
    // The temp summary documents are _eventually_ removed as we get through the real summary documents

    await this.esClient.deleteByQuery({
      index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
      wait_for_completion: false,
      query: {
        bool: {
          filter: [{ terms: { 'slo.id': summarySloIds } }, { term: { isTempDoc: true } }],
        },
      },
    });
  }
}

function getRemoteClusterName(index: string) {
  if (index.includes(':')) {
    return index.split(':')[0];
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
