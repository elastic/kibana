/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindSLOParams, FindSLOResponse, findSLOResponseSchema, Pagination } from '@kbn/slo-schema';
import { SLO, SLOWithSummary } from '../domain/models';
import { IllegalArgumentError } from '../errors';
import { SLORepository } from './slo_repository';
import { SLOSummary, Sort, SummarySearchClient } from './summary_search_client';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 5000;

export class FindSLO {
  constructor(
    private repository: SLORepository,
    private summarySearchClient: SummarySearchClient
  ) {}

  public async execute(params: FindSLOParams): Promise<FindSLOResponse> {
    const sloSummaryList = await this.summarySearchClient.search(
      params.kqlQuery ?? '',
      params.filters ?? '',
      toSort(params),
      toPagination(params)
    );

    const sloList = await this.repository.findAllByIds(sloSummaryList.results.map((slo) => slo.id));
    const sloListWithSummary = mergeSloWithSummary(sloList, sloSummaryList.results);

    return findSLOResponseSchema.encode({
      page: sloSummaryList.page,
      perPage: sloSummaryList.perPage,
      total: sloSummaryList.total,
      results: sloListWithSummary,
    });
  }
}

function mergeSloWithSummary(sloList: SLO[], sloSummaryList: SLOSummary[]): SLOWithSummary[] {
  return sloSummaryList
    .filter((sloSummary) => sloList.some((s) => s.id === sloSummary.id))
    .map((sloSummary) => ({
      ...sloList.find((s) => s.id === sloSummary.id)!,
      instanceId: sloSummary.instanceId,
      summary: sloSummary.summary,
      groupings: sloSummary.groupings,
    }));
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
