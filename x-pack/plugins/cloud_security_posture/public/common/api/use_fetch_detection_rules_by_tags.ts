/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { RuleResponse } from '../types';
import { DETECTION_ENGINE_RULES_KEY } from '../constants';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export const useFetchDetectionRulesByTags = (tags: string[]) => {
  const { http } = useKibana<CoreStart>().services;

  const query = {
    page: 1,
    per_page: 1,
    filter: convertRuleTagsToKQL(tags),
  };

  return useQuery([DETECTION_ENGINE_RULES_KEY, tags], () =>
    http.fetch<FetchRulesResponse>(DETECTION_ENGINE_RULES_URL_FIND, {
      method: 'GET',
      query,
    })
  );
};
