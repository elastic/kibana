/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetInvestigationParams, GetInvestigationResponse } from '../../common/schema/get';
import { InvestigationRepository } from './investigation_repository';

export async function getInvestigation(
  params: GetInvestigationParams,
  repository: InvestigationRepository
): Promise<GetInvestigationResponse> {
  const investigation = await repository.findById(params.id);

  return investigation;
}
