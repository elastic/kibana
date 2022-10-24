/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindResult, RulesClient } from '@kbn/alerting-plugin/server';

import type {
  FieldsOrUndefined,
  PageOrUndefined,
  PerPageOrUndefined,
  QueryFilterOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '../../../../../../common/detection_engine/schemas/common';

import type { RuleParams } from '../../../rule_schema';
import { enrichFilterWithRuleTypeMapping } from './enrich_filter_with_rule_type_mappings';

export interface FindRuleOptions {
  rulesClient: RulesClient;
  filter: QueryFilterOrUndefined;
  fields: FieldsOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  page: PageOrUndefined;
  perPage: PerPageOrUndefined;
}

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
  });
};
