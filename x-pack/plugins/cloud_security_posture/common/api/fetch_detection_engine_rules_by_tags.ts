/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core-http-browser';
import { RuleResponse } from '../schemas';

export interface FetchRulesProps {
  pagination?: {
    page: number;
    perPage: number;
  };
  http: HttpStart;
  tags: string[];
}

export interface FetchRulesResponse {
  page: number;
  perPage: number;
  total: number;
  data: RuleResponse[];
}

export const TAGS_FIELD = 'alert.attributes.tags';

const DETECTION_ENGINE_URL = '/api/detection_engine' as const;
const DETECTION_ENGINE_RULES_URL = `${DETECTION_ENGINE_URL}/rules` as const;
export const DETECTION_ENGINE_RULES_URL_FIND = `${DETECTION_ENGINE_RULES_URL}/_find` as const;

export function convertRuleTagsToKQL(tags: string[]): string {
  return `${TAGS_FIELD}:(${tags.map((tag) => `"${tag}"`).join(' AND ')})`;
}

export const fetchDetectionEngineRulesByTags = async ({
  http,
  tags,
  pagination = {
    page: 1,
    perPage: 1,
  },
}: FetchRulesProps): Promise<FetchRulesResponse> => {
  const query = {
    page: pagination.page,
    per_page: pagination.perPage,
    filter: convertRuleTagsToKQL(tags),
  };

  return http.fetch<FetchRulesResponse>(DETECTION_ENGINE_RULES_URL_FIND, {
    method: 'GET',
    query,
  });
};
