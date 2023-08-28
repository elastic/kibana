/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RewriteRequestCase } from '@kbn/actions-plugin/common';
import { AggregateOptions } from '../../../../../../application/rule/methods/aggregate';

export const transformAggregateQueryRequest: RewriteRequestCase<AggregateOptions> = ({
  default_search_operator: defaultSearchOperator,
  has_reference: hasReference,
  search_fields: searchFields,
  ...rest
}) => ({
  ...rest,
  defaultSearchOperator,
  ...(hasReference ? { hasReference } : {}),
  ...(searchFields ? { searchFields } : {}),
});
