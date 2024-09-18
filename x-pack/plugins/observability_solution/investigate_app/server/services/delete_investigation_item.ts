/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import { InvestigationRepository } from './investigation_repository';

export async function deleteInvestigationItem(
  investigationId: string,
  itemId: string,
  { repository, user }: { repository: InvestigationRepository; user: AuthenticatedUser }
): Promise<void> {
  const investigation = await repository.findById(investigationId);
  const item = investigation.items.find((currItem) => currItem.id === itemId);
  if (!item) {
    throw new Error('Note not found');
  }

  if (item.createdBy !== user.username) {
    throw new Error('User does not have permission to delete note');
  }

  investigation.items = investigation.items.filter((currItem) => currItem.id !== itemId);
  await repository.save(investigation);
}
