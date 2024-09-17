/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import {
  CreateInvestigationItemParams,
  CreateInvestigationItemResponse,
} from '@kbn/investigation-shared';
import { v4 } from 'uuid';
import { InvestigationRepository } from './investigation_repository';

export async function createInvestigationItem(
  investigationId: string,
  params: CreateInvestigationItemParams,
  { repository, user }: { repository: InvestigationRepository; user: AuthenticatedUser }
): Promise<CreateInvestigationItemResponse> {
  const investigation = await repository.findById(investigationId);

  const now = Date.now();
  const investigationItem = {
    id: v4(),
    createdBy: user.username,
    createdAt: now,
    updatedAt: now,
    ...params,
  };
  investigation.items.push(investigationItem);

  await repository.save(investigation);

  return investigationItem;
}
