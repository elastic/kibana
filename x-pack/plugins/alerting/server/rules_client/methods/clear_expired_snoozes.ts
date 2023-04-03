/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { SavedObjectReference } from '@kbn/core/server';

import { RawRule } from '../../types';
import { partiallyUpdateAlert } from '../../saved_objects';
import { isSnoozeExpired } from '../../lib';
import { RulesClientContext } from '../types';
import { updateMeta, migrateLegacyActions } from '../lib';

export async function clearExpiredSnoozes(
  context: RulesClientContext,
  { id }: { id: string }
): Promise<void> {
  const { attributes, version, references } =
    await context.unsecuredSavedObjectsClient.get<RawRule>('alert', id);

  const snoozeSchedule = attributes.snoozeSchedule
    ? attributes.snoozeSchedule.filter((s) => {
        try {
          return !isSnoozeExpired(s);
        } catch (e) {
          context.logger.error(`Error checking for expiration of snooze ${s.id}: ${e}`);
          return true;
        }
      })
    : [];

  if (snoozeSchedule.length === attributes.snoozeSchedule?.length) return;

  let legacyActions: RawRule['actions'] = [];
  let legacyActionsReferences: SavedObjectReference[] = [];

  // migrate legacy actions only for SIEM rules
  if (attributes.consumer === AlertConsumers.SIEM) {
    const migratedActions = await migrateLegacyActions(context, {
      ruleId: id,
    });

    legacyActions = migratedActions.legacyActions;
    legacyActionsReferences = migratedActions.legacyActionsReferences;
  }

  const updateAttributes = updateMeta(context, {
    snoozeSchedule,
    ...(legacyActions.length ? { actions: [...attributes.actions, ...legacyActions] } : {}),
    updatedBy: await context.getUserName(),
    updatedAt: new Date().toISOString(),
  });
  const updateOptions = {
    version,
    ...(legacyActionsReferences.length
      ? { references: [...references, ...legacyActionsReferences] }
      : {}),
  };

  await partiallyUpdateAlert(
    context.unsecuredSavedObjectsClient,
    id,
    updateAttributes,
    updateOptions
  );
}
