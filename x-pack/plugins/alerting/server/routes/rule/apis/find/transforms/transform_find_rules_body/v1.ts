/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesRequestQueryV1 } from '../../../../../schemas/rule/apis/find';
import { FindRulesOptions } from '../../../../../../application/rule/methods/find';

export const transformFindRulesBody = (params: FindRulesRequestQueryV1): FindRulesOptions => {
  const {
    per_page: perPage,
    page,
    search,
    default_search_operator: defaultSearchOperator,
    search_fields: searchFields,
    sort_field: sortField,
    sort_order: sortOrder,
    has_reference: hasReference,
    fields,
    filter,
    filter_consumers: filterConsumers,
  } = params;
  return {
    ...(page ? { page } : {}),
    ...(search ? { search } : {}),
    ...(fields ? { fields } : {}),
    ...(filter ? { filter } : {}),
    ...(defaultSearchOperator ? { defaultSearchOperator } : {}),
    ...(perPage ? { perPage } : {}),
    ...(filterConsumers ? { filterConsumers } : {}),
    ...(sortField ? { sortField } : {}),
    ...(sortOrder ? { sortOrder } : {}),
    ...(hasReference ? { hasReference } : {}),
    ...(searchFields
      ? { searchFields: Array.isArray(searchFields) ? searchFields : [searchFields] }
      : {}),
  };
};
