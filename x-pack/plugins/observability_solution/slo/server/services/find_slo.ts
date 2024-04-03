/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindSLOParams, FindSLOResponse, findSLOResponseSchema, Pagination } from '@kbn/slo-schema';
import { keyBy } from 'lodash';
import { SLODefinition, SLOWithSummary } from '../domain/models';
import { IllegalArgumentError } from '../errors';
import { SLORepository } from './slo_repository';
import { SummaryResult, Sort, SummarySearchClient } from './summary_search_client';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 5000;

export class FindSLO {
  constructor(
    private repository: SLORepository,
    private summarySearchClient: SummarySearchClient
  ) {}

  public async execute(params: FindSLOParams): Promise<FindSLOResponse> {
    const summaryResults = await this.summarySearchClient.search(
      params.kqlQuery ?? '',
      params.filters ?? '',
      toSort(params),
      toPagination(params)
    );

    const localSloDefinitions = await this.repository.findAllByIds(
      summaryResults.results
        .filter((summaryResult) => !summaryResult.remote)
        .map((summaryResult) => summaryResult.sloId)
    );

    const sloListWithSummary = mergeSloWithSummary(localSloDefinitions, summaryResults.results);

    return findSLOResponseSchema.encode({
      page: summaryResults.page,
      perPage: summaryResults.perPage,
      total: summaryResults.total,
      results: sloListWithSummary,
    });
  }
}

function mergeSloWithSummary(
  localSloDefinitions: SLODefinition[],
  summaryResults: SummaryResult[]
): SLOWithSummary[] {
  const localSloDefinitionsMap = keyBy(localSloDefinitions, (sloDefinition) => sloDefinition.id);

  const localSummaryList = summaryResults
    .filter((summaryResult) => !!localSloDefinitionsMap[summaryResult.sloId])
    .map((summaryResult) => ({
      ...localSloDefinitionsMap[summaryResult.sloId],
      instanceId: summaryResult.instanceId,
      summary: summaryResult.summary,
      groupings: summaryResult.groupings,
    }));

  const remoteSummaryList = summaryResults
    .filter((summaryResult) => !!summaryResult.remote)
    .map((summaryResult) => ({
      ...summaryResult.remote!.slo,
      instanceId: summaryResult.instanceId,
      summary: summaryResult.summary,
      groupings: summaryResult.groupings,
      remoteName: summaryResult.remote!.remoteName,
      kibanaUrl: summaryResult.remote!.kibanaUrl,
    }));

  return [...localSummaryList, ...remoteSummaryList];
}

function toPagination(params: FindSLOParams): Pagination {
  const page = Number(params.page);
  const perPage = Number(params.perPage);

  if (!isNaN(perPage) && perPage > MAX_PER_PAGE) {
    throw new IllegalArgumentError(`perPage limit set to ${MAX_PER_PAGE}`);
  }

  return {
    page: !isNaN(page) && page >= 1 ? page : DEFAULT_PAGE,
    perPage: !isNaN(perPage) && perPage >= 0 ? perPage : DEFAULT_PER_PAGE,
  };
}

function toSort(params: FindSLOParams): Sort {
  return {
    field: params.sortBy ?? 'status',
    direction: params.sortDirection ?? 'asc',
  };
}
