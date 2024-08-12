/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createInvestigationNoteInput,
  createInvestigationNoteResponse,
} from '@kbn/investigate-app-plugin/common/schema/create_notes';
import { InvestigationRepository } from './investigation_repository';
import { v4 } from 'uuid';

export async function createInvestigationNote(
  investigationId: string,
  params: createInvestigationNoteInput,
  repository: InvestigationRepository
): Promise<createInvestigationNoteResponse> {
  const investigation = await repository.findById(investigationId);

  const investigationNote = {
    id: v4(),
    content: params.content,
    createdBy: 'TODO: get user from request',
    createdAt: Date.now(),
  };
  investigation.notes.push(investigationNote);

  await repository.save(investigation);

  return investigationNote;
}
