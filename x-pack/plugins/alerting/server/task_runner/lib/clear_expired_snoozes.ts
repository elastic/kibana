/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeParams, SanitizedRule } from '@kbn/alerting-types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isSnoozeExpired } from '../../lib';
import { partiallyUpdateRuleWithEs } from '../../saved_objects';

interface ClearExpiredSnoozesOpts {
  esClient: ElasticsearchClient;
  logger: Logger;
  rule: Pick<SanitizedRule<RuleTypeParams>, 'id' | 'snoozeSchedule'>;
  version?: string;
}
export async function clearExpiredSnoozes(opts: ClearExpiredSnoozesOpts): Promise<void> {
  const { esClient, logger, rule, version } = opts;

  if (!rule.snoozeSchedule || !rule.snoozeSchedule.length) return;

  const snoozeSchedule = rule.snoozeSchedule
    ? rule.snoozeSchedule.filter((s) => {
        try {
          return !isSnoozeExpired(s);
        } catch (e) {
          logger.error(`Error checking for expiration of snooze ${s.id}: ${e}`);
          return true;
        }
      })
    : [];

  if (snoozeSchedule.length === rule.snoozeSchedule?.length) return;

  const updateAttributes = { snoozeSchedule };

  const updateOptions = { version, refresh: false };

  await partiallyUpdateRuleWithEs(esClient, rule.id, updateAttributes, updateOptions);
}
