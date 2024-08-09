/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FindInvestigationsParams,
  FindInvestigationsResponse,
  findInvestigationsResponseSchema,
} from '../../common/schema/find';
import { InvestigationRepository } from './investigation_repository';

export async function findInvestigations(
  params: FindInvestigationsParams,
  repository: InvestigationRepository
): Promise<FindInvestigationsResponse> {
  const investigations = await repository.search(toPagination(params));

  return findInvestigationsResponseSchema.encode(investigations);
}

function toPagination(params: FindInvestigationsParams) {
  const DEFAULT_PER_PAGE = 10;
  const DEFAULT_PAGE = 1;
  return {
    page: params.page ? parseInt(params.page, 10) : DEFAULT_PAGE,
    perPage: params.perPage ? parseInt(params.perPage, 10) : DEFAULT_PER_PAGE,
  };
}
