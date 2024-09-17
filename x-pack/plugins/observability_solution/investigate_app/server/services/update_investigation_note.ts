/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import { UpdateInvestigationNoteParams } from '@kbn/investigation-shared';
import { InvestigationRepository } from './investigation_repository';

export async function updateInvestigationNote(
  investigationId: string,
  noteId: string,
  params: UpdateInvestigationNoteParams,
  { repository, user }: { repository: InvestigationRepository; user: AuthenticatedUser }
): Promise<void> {
  const investigation = await repository.findById(investigationId);
  const note = investigation.notes.find((currNote) => currNote.id === noteId);
  if (!note) {
    throw new Error('Note not found');
  }

  if (note.createdBy !== user.username) {
    throw new Error('User does not have permission to update note');
  }

  investigation.notes = investigation.notes.filter((currNote) => {
    if (currNote.id === noteId) {
      currNote = Object.assign(currNote, { content: params.content, updatedAt: Date.now() });
    }

    return currNote;
  });

  await repository.save(investigation);
}
