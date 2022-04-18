/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleTypeMappings } from '@kbn/securitysolution-rules';

import { FindResult } from '@kbn/alerting-plugin/server';
import { RuleParams } from '../schemas/rule_schemas';
import { FindRuleOptions } from './types';

export const getFilter = (filter: string | null | undefined) => {
  const alertTypeFilter = `(${Object.values(ruleTypeMappings)
    .map((type) => `alert.attributes.alertTypeId: ${type}`)
    .filter((type, i, arr) => type != null && arr.indexOf(type) === i)
    .join(' OR ')})`;
  if (filter == null) {
    return alertTypeFilter;
  } else {
    return `${alertTypeFilter} AND ${filter}`;
  }
};

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
      filter: getFilter(filter),
      sortOrder,
      sortField,
    },
  });
};
