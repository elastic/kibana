/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindResult } from '../../../../../alerting/server';
import { SIGNALS_ID } from '../../../../common/constants';
import { RuleParams } from '../schemas/rule_schemas';
import { FindRuleOptions } from './types';

export const getFilter = (filter: string | null | undefined) => {
  if (filter == null) {
    return `alert.attributes.alertTypeId: ${SIGNALS_ID}`;
  } else {
    return `alert.attributes.alertTypeId: ${SIGNALS_ID} AND ${filter}`;
  }
};

export const findRules = async ({
  alertsClient,
  perPage,
  page,
  fields,
  filter,
  sortField,
  sortOrder,
}: FindRuleOptions): Promise<FindResult<RuleParams>> => {
  return alertsClient.find({
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
