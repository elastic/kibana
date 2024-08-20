/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateInvestigationNoteInput,
  CreateInvestigationNoteResponse,
} from '@kbn/investigation-shared';
import { v4 } from 'uuid';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { InvestigationRepository } from './investigation_repository';

export async function createInvestigationNote(
  investigationId: string,
  params: CreateInvestigationNoteInput,
  { repository, user }: { repository: InvestigationRepository; user: AuthenticatedUser }
): Promise<CreateInvestigationNoteResponse> {
  const investigation = await repository.findById(investigationId);

  const investigationNote = {
    id: v4(),
    content: params.content,
    createdBy: user.username,
    createdAt: Date.now(),
  };
  investigation.notes.push(investigationNote);

  await repository.save(investigation);

  return investigationNote;
}
