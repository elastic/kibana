/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateInvestigationParams, CreateInvestigationResponse } from '@kbn/investigation-shared';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { InvestigationRepository } from './investigation_repository';

enum InvestigationStatus {
  ongoing = 'ongoing',
  closed = 'closed',
}

export async function createInvestigation(
  params: CreateInvestigationParams,
  { repository, user }: { repository: InvestigationRepository; user: AuthenticatedUser }
): Promise<CreateInvestigationResponse> {
  const investigation = {
    ...params,
    createdAt: Date.now(),
    createdBy: user.username,
    status: InvestigationStatus.ongoing,
    notes: [],
    items: [],
  };
  await repository.save(investigation);

  return investigation;
}
