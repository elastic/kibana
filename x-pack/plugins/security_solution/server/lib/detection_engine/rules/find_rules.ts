/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindResult } from '@kbn/alerting-plugin/server';
import { enrichFilterWithAlertTypes } from './enrich_filter_with_alert_types';

import { RuleParams } from '../schemas/rule_schemas';
import { FindRuleOptions } from './types';

export const findRules = ({
  rulesClient,
  perPage,
  page,
  fields,
  filter,
  sortField,
  sortOrder,
  isRuleRegistryEnabled,
}: FindRuleOptions): Promise<FindResult<RuleParams>> => {
  return rulesClient.find({
    options: {
      fields,
      page,
      perPage,
      filter: enrichFilterWithAlertTypes(filter, isRuleRegistryEnabled),
      sortOrder,
      sortField,
    },
  });
};
