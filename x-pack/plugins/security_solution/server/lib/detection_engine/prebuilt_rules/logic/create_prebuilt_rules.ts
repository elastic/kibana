/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../../common/constants';
import type { PrebuiltRuleToInstall } from '../../../../../common/detection_engine/prebuilt_rules';
import { initPromisePool } from '../../../../utils/promise_pool';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import { createRules } from '../../rule_management/logic/crud/create_rules';

export const createPrebuiltRules = (rulesClient: RulesClient, rules: PrebuiltRuleToInstall[]) =>
  withSecuritySpan('createPrebuiltRules', async () => {
    const result = await initPromisePool({
      concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
      items: rules,
      executor: async (rule) => {
        return createRules({
          rulesClient,
          params: rule,
          immutable: true,
          defaultEnabled: false,
        });
      },
    });

    if (result.errors.length > 0) {
      throw new AggregateError(result.errors, 'Error installing new prebuilt rules');
    }
  });
