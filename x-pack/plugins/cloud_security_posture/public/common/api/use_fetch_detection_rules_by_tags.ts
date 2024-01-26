/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { DETECTION_RULE_RULES_API_CURRENT_VERSION } from '../../../common/constants';
import { RuleResponse } from '../types';
import { DETECTION_ENGINE_RULES_KEY } from '../constants';
import { convertRuleTagsToKQL } from '../../../common/utils/detection_rules';

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

const DETECTION_ENGINE_URL = '/api/detection_engine' as const;
const DETECTION_ENGINE_RULES_URL = `${DETECTION_ENGINE_URL}/rules` as const;
export const DETECTION_ENGINE_RULES_URL_FIND = `${DETECTION_ENGINE_RULES_URL}/_find` as const;

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
      version: DETECTION_RULE_RULES_API_CURRENT_VERSION,
      query,
    })
  );
};
