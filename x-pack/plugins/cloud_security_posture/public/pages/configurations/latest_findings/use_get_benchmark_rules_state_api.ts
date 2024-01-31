/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { CspBenchmarkRulesStates } from '../../../../common/types/latest';
import {
  CSP_GET_BENCHMARK_RULES_STATE_API_CURRENT_VERSION,
  CSP_GET_BENCHMARK_RULES_STATE_ROUTE_PATH,
} from '../../../../common/constants';
import { useKibana } from '../../../common/hooks/use_kibana';

export const getRuleStatesKey = ['get_rules_state_key'];

export const useGetCspBenchmarkRulesStatesApi = () => {
  const { http } = useKibana().services;
  return useQuery<CspBenchmarkRulesStates, unknown, CspBenchmarkRulesStates>(getRuleStatesKey, () =>
    http.get<CspBenchmarkRulesStates>(CSP_GET_BENCHMARK_RULES_STATE_ROUTE_PATH, {
      version: CSP_GET_BENCHMARK_RULES_STATE_API_CURRENT_VERSION,
    })
  );
};
