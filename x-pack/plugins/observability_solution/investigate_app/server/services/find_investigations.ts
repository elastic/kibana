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
} from '@kbn/investigation-shared';
import { InvestigationRepository, Search } from './investigation_repository';
import { InvestigationStatus } from '../models/investigation';

export async function findInvestigations(
  params: FindInvestigationsParams,
  repository: InvestigationRepository
): Promise<FindInvestigationsResponse> {
  const investigations = await repository.search({
    search: toSearch(params),
    filter: toFilter(params),
    pagination: toPagination(params),
  });

  return findInvestigationsResponseSchema.parse(investigations);
}

function toPagination(params: FindInvestigationsParams) {
  const DEFAULT_PER_PAGE = 10;
  const DEFAULT_PAGE = 1;
  return {
    page: params?.page && params.page >= 1 ? params.page : DEFAULT_PAGE,
    perPage:
      params?.perPage && params.perPage > 0 && params.perPage <= 100
        ? params.perPage
        : DEFAULT_PER_PAGE,
  };
}

function toSearch(params: FindInvestigationsParams): Search | undefined {
  if (params?.search) {
    return { search: params.search };
  }
}

function toFilter(params: FindInvestigationsParams): string | undefined {
  if (params?.alertId) {
    const activeStatus: InvestigationStatus = 'active';
    const triageStatus: InvestigationStatus = 'triage';
    return `investigation.attributes.origin.id:(${params.alertId}) AND (investigation.attributes.status: ${activeStatus} OR investigation.attributes.status: ${triageStatus})`;
  }
}
