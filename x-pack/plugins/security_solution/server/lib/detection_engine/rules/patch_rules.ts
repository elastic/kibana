/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialRule } from '@kbn/alerting-plugin/server';
import type { RuleParams } from '../schemas/rule_schemas';
import type { PatchRulesOptions } from './types';
import { maybeMute } from './utils';
import { convertPatchAPIToInternalSchema } from '../schemas/rule_converters';

export const patchRules = async ({
  rulesClient,
  existingRule,
  nextParams,
}: PatchRulesOptions): Promise<PartialRule<RuleParams> | null> => {
  if (existingRule == null) {
    return null;
  }

  const patchedRule = convertPatchAPIToInternalSchema(nextParams, existingRule);

  const update = await rulesClient.update({
    id: existingRule.id,
    data: patchedRule,
  });

  if (nextParams.throttle !== undefined) {
    await maybeMute({
      rulesClient,
      muteAll: existingRule.muteAll,
      throttle: nextParams.throttle,
      id: update.id,
    });
  }

  if (existingRule.enabled && nextParams.enabled === false) {
    await rulesClient.disable({ id: existingRule.id });
  } else if (!existingRule.enabled && nextParams.enabled === true) {
    await rulesClient.enable({ id: existingRule.id });
  } else {
    // enabled is null or undefined and we do not touch the rule
  }

  if (nextParams.enabled != null) {
    return { ...update, enabled: nextParams.enabled };
  } else {
    return update;
  }
};
