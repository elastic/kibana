/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core-http-browser';

const INTERNAL_FIND_RULES_URL = '/internal/alerting/rules/_find';

export interface Rule {
  id: string;
  muted_alert_ids: string[];
}

export interface FindRulesResponse {
  data: Rule[];
}

export const getMutedAlerts = async (
  http: HttpStart,
  params: { ruleIds: string[] },
  signal?: AbortSignal
) => {
  return http.post<FindRulesResponse>(INTERNAL_FIND_RULES_URL, {
    body: JSON.stringify({
      rule_type_ids: params.ruleIds,
      fields: ['id', 'mutedInstanceIds'],
      page: 1,
      per_page: params.ruleIds.length,
    }),
    signal,
  });
};
