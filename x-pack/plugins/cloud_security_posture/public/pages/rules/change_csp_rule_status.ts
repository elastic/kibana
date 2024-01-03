/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH } from '../../../common/constants';

export const useChangeCspRuleStatus = () => {
  const { http } = useKibana().services;

  const res = async (actionOnRule: 'mute' | 'unmute', ruleIds: any[]) => {
    const query = {
      action: actionOnRule,
      rules: ruleIds,
    };
    return await http?.post<any>(CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH, {
      version: '1',
      body: JSON.stringify(query),
    });
  };

  return res;
};
