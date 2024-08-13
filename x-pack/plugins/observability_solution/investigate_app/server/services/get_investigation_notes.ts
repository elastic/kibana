/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetInvestigationNotesResponse,
  getInvestigationNotesResponseSchema,
} from '../../common/schema/get_notes';
import { InvestigationRepository } from './investigation_repository';

export async function getInvestigationNotes(
  investigationId: string,
  repository: InvestigationRepository
): Promise<GetInvestigationNotesResponse> {
  const investigation = await repository.findById(investigationId);

  return getInvestigationNotesResponseSchema.encode(investigation.notes);
}
