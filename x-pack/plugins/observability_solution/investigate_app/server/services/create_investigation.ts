/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateInvestigationInput, CreateInvestigationResponse } from '../../common/schema/create';
import { InvestigationRepository } from './investigation_repository';

export async function createInvestigation(
  params: CreateInvestigationInput,
  repository: InvestigationRepository
): Promise<CreateInvestigationResponse> {
  const investigation = { ...params, createdAt: Date.now(), createdBy: 'elastic' };
  await repository.save(investigation);

  return investigation;
}
