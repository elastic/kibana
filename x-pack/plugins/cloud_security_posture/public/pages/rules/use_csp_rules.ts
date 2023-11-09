/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { GetCspRuleTemplateRequest, GetCspRuleTemplateResponse } from '../../../common/types';
import { useKibana } from '../../common/hooks/use_kibana';

import {
  CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
  FIND_CSP_RULE_TEMPLATE_API_CURRENT_VERSION,
  FIND_CSP_RULE_TEMPLATE_ROUTE_PATH,
} from '../../../common/constants';

export type RulesQuery = Pick<GetCspRuleTemplateRequest, 'section' | 'search' | 'page' | 'perPage'>;
export type RulesQueryResult = ReturnType<typeof useFindCspRuleTemplates>;

export const useFindCspRuleTemplates = (
  { search, page, perPage, section }: RulesQuery,
  packagePolicyId: string
) => {
  const { http } = useKibana().services;

  return useQuery(
    [CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE, { section, search, page, perPage, packagePolicyId }],
    () => {
      return http.get<GetCspRuleTemplateResponse>(FIND_CSP_RULE_TEMPLATE_ROUTE_PATH, {
        query: { packagePolicyId, page, perPage, search, section },
        version: FIND_CSP_RULE_TEMPLATE_API_CURRENT_VERSION,
      });
    }
  );
};
