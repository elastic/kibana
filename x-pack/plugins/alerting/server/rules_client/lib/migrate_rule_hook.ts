/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '..';

import { get } from '../methods/get';
import { update } from '../methods/update';
import { find } from '../methods/find';
import { deleteRule } from '../methods/delete';

type MigrateRuleHook = (
  context: RulesClientContext,
  { ruleId }: { ruleId: string }
) => Promise<void>;

export const migrateRuleHook: MigrateRuleHook = async (context, { ruleId }) => {
  const rule = await get(context, { id: ruleId });

  const ruleType = context.ruleTypeRegistry.get(rule.alertTypeId);

  await ruleType?.migrateRule?.(
    { rule },
    {
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      logger: context.logger,
      update: (params) => update(context, params),
      find: (params) => find(context, params),
      delete: (params) => deleteRule(context, params),
    }
  );
};
