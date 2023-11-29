/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetRuleManagementFiltersResponse } from '@kbn/security-solution-plugin/common';
import { RULE_MANAGEMENT_FILTERS_URL } from '@kbn/security-solution-plugin/common';
import type { HttpSetup } from '@kbn/core/public';

export const fetchRuleManagementFilters = async ({
  http,
  signal,
}: {
  http: HttpSetup;
  signal?: AbortSignal;
}): Promise<GetRuleManagementFiltersResponse> =>
  http.fetch<GetRuleManagementFiltersResponse>(RULE_MANAGEMENT_FILTERS_URL, {
    method: 'GET',
    version: '1',
    signal,
  });
