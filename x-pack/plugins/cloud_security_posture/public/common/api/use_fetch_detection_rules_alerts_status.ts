/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { GET_DETECTION_RULE_ALERTS_STATUS_PATH } from '../../../common/constants';

const DETECTION_ENGINE_RULES_ALERTS_KEY = 'detection_engine_rules_alerts';

export const useFetchDetectionRulesAlertsStatus = (tags: string[]) => {
  const { http } = useKibana().services;

  if (!http) {
    throw new Error('Kibana http service is not available');
  }

  // options?: UseQueryOptions<unknown, unknown, CnvmDashboardData, string[]>
  // ) => {
  // const { http } = useKibana().services;
  return useQuery(
    [DETECTION_ENGINE_RULES_ALERTS_KEY, tags],
    () =>
      http.get(GET_DETECTION_RULE_ALERTS_STATUS_PATH, {
        version: '1',
        query: { tags },
      })
    // options
  );
  // };

  // return useQuery([DETECTION_ENGINE_RULES_ALERTS_KEY, tags], () =>
  //   fetchDetectionEngineRulesByTags({ http, tags })
  // );
};
