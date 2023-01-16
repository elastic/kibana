/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindSLOParams, FindSLOResponse, findSLOResponseSchema } from '@kbn/slo-schema';
import { IndicatorData, SLO, SLOId, SLOWithSummary } from '../../domain/models';
import { computeErrorBudget, computeSLI, computeSummaryStatus } from '../../domain/services';
import { SLIClient } from './sli_client';
import {
  Criteria,
  Paginated,
  Pagination,
  SLORepository,
  Sort,
  SortField,
  SortDirection,
} from './slo_repository';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

export class FindSLO {
  constructor(private repository: SLORepository, private sliClient: SLIClient) {}

  public async execute(params: FindSLOParams): Promise<FindSLOResponse> {
    const pagination: Pagination = toPagination(params);
    const criteria: Criteria = toCriteria(params);
    const sort: Sort = toSort(params);

    const { results: sloList, ...resultMeta }: Paginated<SLO> = await this.repository.find(
      criteria,
      sort,
      pagination
    );
    const indicatorDataBySlo = await this.sliClient.fetchCurrentSLIData(sloList);
    const sloListWithSummary = computeSloWithSummary(sloList, indicatorDataBySlo);

    return this.toResponse(sloListWithSummary, resultMeta);
  }

  private toResponse(
    sloList: SLOWithSummary[],
    resultMeta: Omit<Paginated<SLO>, 'results'>
  ): FindSLOResponse {
    return findSLOResponseSchema.encode({
      page: resultMeta.page,
      perPage: resultMeta.perPage,
      total: resultMeta.total,
      results: sloList,
    });
  }
}

function computeSloWithSummary(
  sloList: SLO[],
  indicatorDataBySlo: Record<SLOId, IndicatorData>
): SLOWithSummary[] {
  const sloListWithSummary: SLOWithSummary[] = [];
  for (const slo of sloList) {
    const sliValue = computeSLI(indicatorDataBySlo[slo.id]);
    const errorBudget = computeErrorBudget(slo, indicatorDataBySlo[slo.id]);
    const status = computeSummaryStatus(slo, sliValue, errorBudget);
    sloListWithSummary.push({
      ...slo,
      summary: { status, sliValue, errorBudget },
    });
  }
  return sloListWithSummary;
}

function toPagination(params: FindSLOParams): Pagination {
  const page = Number(params.page);
  const perPage = Number(params.perPage);

  return {
    page: !isNaN(page) && page >= 1 ? page : DEFAULT_PAGE,
    perPage: !isNaN(perPage) && perPage >= 1 ? perPage : DEFAULT_PER_PAGE,
  };
}

function toCriteria(params: FindSLOParams): Criteria {
  return { name: params.name, indicatorTypes: params.indicatorTypes };
}

function toSort(params: FindSLOParams): Sort {
  return {
    field: params.sortBy === 'indicatorType' ? SortField.IndicatorType : SortField.Name,
    direction: params.sortDirection === 'desc' ? SortDirection.Desc : SortDirection.Asc,
  };
}
