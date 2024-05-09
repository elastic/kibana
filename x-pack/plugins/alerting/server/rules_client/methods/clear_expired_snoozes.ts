/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeParams, SanitizedRule } from '../../../common';
import { partiallyUpdateRule } from '../../saved_objects';
import { isSnoozeExpired } from '../../lib';
import { RulesClientContext } from '../types';
import { updateMeta } from '../lib';

export async function clearExpiredSnoozes(
  context: RulesClientContext,
  {
    rule,
    version,
  }: { rule: Pick<SanitizedRule<RuleTypeParams>, 'id' | 'snoozeSchedule'>; version?: string }
): Promise<void> {
  const snoozeSchedule = rule.snoozeSchedule
    ? rule.snoozeSchedule.filter((s) => {
        try {
          return !isSnoozeExpired(s);
        } catch (e) {
          context.logger.error(`Error checking for expiration of snooze ${s.id}: ${e}`);
          return true;
        }
      })
    : [];

  if (snoozeSchedule.length === rule.snoozeSchedule?.length) return;

  const updateAttributes = updateMeta(context, {
    snoozeSchedule,
    updatedBy: await context.getUserName(),
    updatedAt: new Date().toISOString(),
  });

  const updateOptions = { version, refresh: false };

  await partiallyUpdateRule(
    context.unsecuredSavedObjectsClient,
    rule.id,
    updateAttributes,
    updateOptions
  );
}
