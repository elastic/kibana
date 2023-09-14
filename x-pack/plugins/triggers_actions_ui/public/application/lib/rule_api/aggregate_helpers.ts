/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { RewriteRequestCase } from '@kbn/actions-plugin/common';
import { RuleStatus } from '../../../types';

export interface GetRuleTagsResponse {
  total: number;
  page: number;
  perPage: number;
  data: string[];
}

export const rewriteTagsBodyRes: RewriteRequestCase<GetRuleTagsResponse> = ({
  per_page: perPage,
  ...rest
}) => ({
  perPage,
  ...rest,
});

export interface LoadRuleAggregationsProps {
  http: HttpSetup;
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
  ruleExecutionStatusesFilter?: string[];
  ruleLastRunOutcomesFilter?: string[];
  ruleStatusesFilter?: RuleStatus[];
  tagsFilter?: string[];
}

export interface LoadRuleTagsProps {
  http: HttpSetup;
  search?: string;
  perPage?: number;
  page: number;
}
