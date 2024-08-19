/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateInvestigationInput, CreateInvestigationResponse } from '@kbn/investigation-shared';
import { InvestigationRepository } from './investigation_repository';

enum InvestigationStatus {
  ongoing = 'ongoing',
  closed = 'closed',
}

export async function createInvestigation(
  params: CreateInvestigationInput,
  repository: InvestigationRepository
): Promise<CreateInvestigationResponse> {
  const investigation = {
    ...params,
    createdAt: Date.now(),
    createdBy: 'elastic',
    status: InvestigationStatus.ongoing,
    notes: [],
  };
  await repository.save(investigation);

  return investigation;
}
