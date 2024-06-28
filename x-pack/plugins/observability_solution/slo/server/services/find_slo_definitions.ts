/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FindSLODefinitionsParams,
  FindSLODefinitionsResponse,
  findSloDefinitionsResponseSchema,
  Pagination,
} from '@kbn/slo-schema';
import { IllegalArgumentError } from '../errors';
import { SLORepository } from './slo_repository';

const MAX_PER_PAGE = 1000;
const DEFAULT_PER_PAGE = 100;
const DEFAULT_PAGE = 1;

export class FindSLODefinitions {
  constructor(private repository: SLORepository) {}

  public async execute(params: FindSLODefinitionsParams): Promise<FindSLODefinitionsResponse> {
    const result = await this.repository.search(params.search ?? '', toPagination(params), {
      includeOutdatedOnly: params.includeOutdatedOnly === true ? true : false,
    });
    return findSloDefinitionsResponseSchema.encode(result);
  }
}

function toPagination(params: FindSLODefinitionsParams): Pagination {
  const page = Number(params.page);
  const perPage = Number(params.perPage);

  if (!isNaN(perPage) && perPage > MAX_PER_PAGE) {
    throw new IllegalArgumentError(`perPage limit set to ${MAX_PER_PAGE}`);
  }

  return {
    page: !isNaN(page) && page >= 1 ? page : DEFAULT_PAGE,
    perPage: !isNaN(perPage) && perPage >= 1 ? perPage : DEFAULT_PER_PAGE,
  };
}
