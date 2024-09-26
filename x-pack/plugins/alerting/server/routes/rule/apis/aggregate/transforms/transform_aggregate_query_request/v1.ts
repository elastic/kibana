/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RewriteRequestCase } from '@kbn/actions-plugin/common';
import { AggregateOptions } from '../../../../../../application/rule/methods/aggregate/types';

export const transformAggregateQueryRequest: RewriteRequestCase<AggregateOptions> = ({
  search,
  default_search_operator: defaultSearchOperator,
  search_fields: searchFields,
  has_reference: hasReference,
  rule_type_ids: ruleTypeIds,
  filter,
}) => ({
  defaultSearchOperator,
  ...(hasReference ? { hasReference } : {}),
  ...(searchFields ? { searchFields } : {}),
  ...(search ? { search } : {}),
  ...(ruleTypeIds ? { ruleTypeIds } : {}),
  ...(filter ? { filter } : {}),
});
