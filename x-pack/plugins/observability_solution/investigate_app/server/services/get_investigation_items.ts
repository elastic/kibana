/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetInvestigationItemsResponse,
  getInvestigationItemsResponseSchema,
} from '@kbn/investigation-shared';
import { InvestigationRepository } from './investigation_repository';

export async function getInvestigationItems(
  investigationId: string,
  repository: InvestigationRepository
): Promise<GetInvestigationItemsResponse> {
  const investigation = await repository.findById(investigationId);

  return getInvestigationItemsResponseSchema.encode(investigation.items);
}
