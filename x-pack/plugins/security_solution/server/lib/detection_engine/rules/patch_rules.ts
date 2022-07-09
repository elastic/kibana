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
  rule,
  params,
}: PatchRulesOptions): Promise<PartialRule<RuleParams> | null> => {
  if (rule == null) {
    return null;
  }

  const patchedRule = convertPatchAPIToInternalSchema(params, rule);

  const update = await rulesClient.update({
    id: rule.id,
    data: patchedRule,
  });

  if (params.throttle !== undefined) {
    await maybeMute({
      rulesClient,
      muteAll: rule.muteAll,
      throttle: params.throttle,
      id: update.id,
    });
  }

  if (rule.enabled && params.enabled === false) {
    await rulesClient.disable({ id: rule.id });
  } else if (!rule.enabled && params.enabled === true) {
    await rulesClient.enable({ id: rule.id });
  } else {
    // enabled is null or undefined and we do not touch the rule
  }

  if (params.enabled != null) {
    return { ...update, enabled: params.enabled };
  } else {
    return update;
  }
};
