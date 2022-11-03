/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO } from '../../types/models';
import { FindSLOParams, FindSLOResponse, findSLOResponseSchema } from '../../types/rest_specs';
import { Criteria, Paginated, Pagination, SLORepository } from './slo_repository';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

export class FindSLO {
  constructor(private repository: SLORepository) {}

  public async execute(params: FindSLOParams): Promise<FindSLOResponse> {
    const pagination: Pagination = toPagination(params);
    const criteria: Criteria = toCriteria(params);
    const result = await this.repository.find(criteria, pagination);
    return this.toResponse(result);
  }

  private toResponse(result: Paginated<SLO>): FindSLOResponse {
    return findSLOResponseSchema.encode({
      page: result.page,
      per_page: result.perPage,
      total: result.total,
      results: result.results,
    });
  }
}

function toPagination(params: FindSLOParams): Pagination {
  const page = Number(params.page);
  const perPage = Number(params.per_page);

  return {
    page: !isNaN(page) && page >= 1 ? page : DEFAULT_PAGE,
    perPage: !isNaN(perPage) && perPage >= 1 ? perPage : DEFAULT_PER_PAGE,
  };
}

function toCriteria(params: FindSLOParams): Criteria {
  return { nameFilter: params.name_filter };
}
