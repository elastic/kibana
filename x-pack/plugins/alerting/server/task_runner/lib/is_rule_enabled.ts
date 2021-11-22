/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RawAlert } from '../../types';
import { TaskRunnerContext } from '../task_runner_factory';

export async function isRuleEnabled(context: TaskRunnerContext, ruleId: string, spaceId: string) {
  const namespace = context.spaceIdToNamespace(spaceId);
  // Only fetch encrypted attributes here, we'll create a saved objects client
  // scoped with the API key to fetch the remaining data.
  const {
    attributes: { enabled },
  } = await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAlert>(
    'alert',
    ruleId,
    { namespace }
  );

  return enabled;
}
