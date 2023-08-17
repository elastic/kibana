/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FindCompositeSLOParams,
  FindCompositeSLOResponse,
  findCompositeSLOResponseSchema,
} from '@kbn/slo-schema';
import { CompositeSLO } from '../../domain/models';
import {
  CompositeSLORepository,
  Paginated,
  Pagination,
  Sort,
  SortDirection,
  SortField,
  Criteria,
} from './composite_slo_repository';
import { SummaryClient } from './summary_client';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

export class FindCompositeSLO {
  constructor(private repository: CompositeSLORepository, private summaryClient: SummaryClient) {}

  public async execute(params: FindCompositeSLOParams): Promise<FindCompositeSLOResponse> {
    const pagination: Pagination = toPagination(params);
    const criteria: Criteria = toCriteria(params);
    const sort: Sort = toSort(params);

    const { results: compositeSloList, ...resultMeta }: Paginated<CompositeSLO> =
      await this.repository.find(criteria, sort, pagination);
    const summaryByCompositeSlo = await this.summaryClient.fetchSummary(compositeSloList);

    return findCompositeSLOResponseSchema.encode({
      page: resultMeta.page,
      perPage: resultMeta.perPage,
      total: resultMeta.total,
      results: compositeSloList.map((compositeSlo) => ({
        ...compositeSlo,
        summary: summaryByCompositeSlo[compositeSlo.id],
      })),
    });
  }
}

function toCriteria(params: FindCompositeSLOParams): Criteria {
  return { name: params.name };
}

function toPagination(params: FindCompositeSLOParams): Pagination {
  const page = Number(params.page);
  const perPage = Number(params.perPage);

  return {
    page: !isNaN(page) && page >= 1 ? page : DEFAULT_PAGE,
    perPage: !isNaN(perPage) && perPage >= 1 ? perPage : DEFAULT_PER_PAGE,
  };
}

function toSort(params: FindCompositeSLOParams): Sort {
  return {
    field: SortField.CreationTime,
    direction: params.sortDirection === 'desc' ? SortDirection.Desc : SortDirection.Asc,
  };
}
