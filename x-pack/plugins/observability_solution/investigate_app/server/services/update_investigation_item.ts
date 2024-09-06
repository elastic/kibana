/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import { UpdateInvestigationItemParams } from '@kbn/investigation-shared';
import { InvestigationRepository } from './investigation_repository';

export async function updateInvestigationItem(
  investigationId: string,
  itemId: string,
  params: UpdateInvestigationItemParams,
  { repository, user }: { repository: InvestigationRepository; user: AuthenticatedUser }
): Promise<void> {
  const investigation = await repository.findById(investigationId);
  const item = investigation.items.find((currItem) => currItem.id === itemId);
  if (!item) {
    throw new Error('Item not found');
  }

  if (item.type !== params.type) {
    throw new Error('Cannot change item type');
  }

  if (item.createdBy !== user.username) {
    throw new Error('User does not have permission to update item');
  }

  investigation.items = investigation.items.filter((currItem) => {
    if (currItem.id === itemId) {
      currItem = { ...currItem, ...params };
    }

    return currItem;
  });

  await repository.save(investigation);
}
