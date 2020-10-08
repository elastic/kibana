/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SortFieldOrUndefined } from '../../../common/schemas';

export const getSourceWithTieBreaker = ({
  sortField,
}: {
  sortField: SortFieldOrUndefined;
}): string[] => {
  return sortField != null ? ['tie_breaker_id', sortField] : ['tie_breaker_id'];
};
