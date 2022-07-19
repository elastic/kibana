/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import { NOTIFICATION_THROTTLE_NO_ACTIONS } from '../../../../common/constants';
import type { CreateRulesOptions } from './types';
import { convertCreateAPIToInternalSchema } from '../schemas/rule_converters';
import type { RuleParams } from '../schemas/rule_schemas';

export const createRules = async ({
  rulesClient,
  params,
  id,
  immutable = false,
  defaultEnabled = true,
}: CreateRulesOptions): Promise<SanitizedRule<RuleParams>> => {
  const internalRule = convertCreateAPIToInternalSchema(params, immutable, defaultEnabled);
  const rule = await rulesClient.create<RuleParams>({
    options: {
      id,
    },
    data: internalRule,
  });

  // Mute the rule if it is first created with the explicit no actions
  if (params.throttle === NOTIFICATION_THROTTLE_NO_ACTIONS) {
    await rulesClient.muteAll({ id: rule.id });
  }

  return rule;
};
