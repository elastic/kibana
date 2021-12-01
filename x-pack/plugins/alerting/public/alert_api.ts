/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ALERTING_API_PATH } from '../common';
import type { Rule, RuleType } from '../common';

export async function loadAlertTypes({ http }: { http: HttpSetup }): Promise<RuleType[]> {
  return await http.get(`${BASE_ALERTING_API_PATH}/rule_types`);
}

export async function loadAlertType({
  http,
  id,
}: {
  http: HttpSetup;
  id: RuleType['id'];
}): Promise<RuleType | undefined> {
  const alertTypes = (await http.get(`${BASE_ALERTING_API_PATH}/rule_types`)) as RuleType[];
  return alertTypes.find((type) => type.id === id);
}

export async function loadAlert({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<Rule> {
  return await http.get(`${BASE_ALERTING_API_PATH}/rule/${alertId}`);
}
