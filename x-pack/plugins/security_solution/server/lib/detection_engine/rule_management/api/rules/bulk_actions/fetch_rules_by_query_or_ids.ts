/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../../../../common/constants';
import type { PromisePoolOutcome } from '../../../../../../utils/promise_pool';
import { initPromisePool } from '../../../../../../utils/promise_pool';
import type { RuleAlertType } from '../../../../rule_schema';
import { readRules } from '../../../logic/detection_rules_client/read_rules';
import { findRules } from '../../../logic/search/find_rules';
import { MAX_RULES_TO_PROCESS_TOTAL } from './route';

export const fetchRulesByQueryOrIds = async ({
  query,
  ids,
  rulesClient,
  abortSignal,
}: {
  query: string | undefined;
  ids: string[] | undefined;
  rulesClient: RulesClient;
  abortSignal: AbortSignal;
}): Promise<PromisePoolOutcome<string, RuleAlertType>> => {
  if (ids) {
    return initPromisePool({
      concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
      items: ids,
      executor: async (id: string) => {
        const rule = await readRules({ id, rulesClient, ruleId: undefined });
        if (rule == null) {
          throw Error('Rule not found');
        }
        return rule;
      },
      abortSignal,
    });
  }

  const { data, total } = await findRules({
    rulesClient,
    perPage: MAX_RULES_TO_PROCESS_TOTAL,
    filter: query,
    page: undefined,
    sortField: undefined,
    sortOrder: undefined,
    fields: undefined,
  });

  if (total > MAX_RULES_TO_PROCESS_TOTAL) {
    throw new BadRequestError(
      `More than ${MAX_RULES_TO_PROCESS_TOTAL} rules matched the filter query. Try to narrow it down.`
    );
  }

  return {
    results: data.map((rule) => ({ item: rule.id, result: rule })),
    errors: [],
  };
};
