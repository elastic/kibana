/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindResult } from '../../../../../alerting/server';
import { SIGNALS_ID } from '../../../../common/constants';
import { RuleParams } from '../schemas/rule_schemas';
import { ruleTypeMappings } from '../signals/utils';
import { FindRuleOptions } from './types';

export const getFilter = (
  filter: string | null | undefined,
  isRuleRegistryEnabled: boolean = false
) => {
  const alertTypeFilter = isRuleRegistryEnabled
    ? `(${Object.values(ruleTypeMappings)
        .map((type) => (type !== SIGNALS_ID ? `alert.attributes.alertTypeId: ${type}` : undefined))
        .filter((type) => type != null)
        .join(' OR ')})`
    : `alert.attributes.alertTypeId: ${SIGNALS_ID}`;
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
  isRuleRegistryEnabled,
}: FindRuleOptions): Promise<FindResult<RuleParams>> => {
  return rulesClient.find({
    options: {
      fields,
      page,
      perPage,
      filter: getFilter(filter, isRuleRegistryEnabled),
      sortOrder,
      sortField,
    },
  });
};
