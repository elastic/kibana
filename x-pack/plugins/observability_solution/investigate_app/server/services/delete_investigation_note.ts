/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvestigationRepository } from './investigation_repository';

export async function deleteInvestigationNote(
  investigationId: string,
  noteId: string,
  repository: InvestigationRepository
): Promise<void> {
  const investigation = await repository.findById(investigationId);
  investigation.notes = investigation.notes.filter((note) => note.id !== noteId);
  await repository.save(investigation);
}
