/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindResult } from '@kbn/alerting-plugin/server';
import { enrichFilterWithRuleTypeMapping } from './enrich_filter_with_rule_type_mappings';

import type { RuleParams } from '../schemas/rule_schemas';
import type { FindRuleOptions } from './types';

export const findRules = ({
  rulesClient,
  perPage,
  page,
  fields,
  filter,
  sortField,
  sortOrder,
}: FindRuleOptions): Promise<FindResult<RuleParams>> => {
  return rulesClient.find({
    options: {
      fields,
      page,
      perPage,
      filter: enrichFilterWithRuleTypeMapping(filter),
      sortOrder,
      sortField,
    },
    includeSnoozeData: true,
  });
};
