/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { withInventorySpan } from '../../lib/with_inventory_span';

export async function getRules({
  logger,
  rulesClient,
  ruleIds,
}: {
  logger: Logger;
  rulesClient: RulesClient;
  ruleIds: string[];
}) {
  const rules = await withInventorySpan(
    'get_rules',
    () =>
      rulesClient.find<Record<string, any>>({
        options: {
          perPage: 10_000,
          filter: ruleIds.length
            ? `id:(${ruleIds.map((ruleId) => `"${ruleId}"`).join(' OR ')}`
            : undefined,
        },
      }),
    logger
  );

  return rules;
}
