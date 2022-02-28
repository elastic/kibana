/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ALERTING_API_PATH, INTERNAL_BASE_ALERTING_API_PATH } from '../common';
import type { Alert, RuleType } from '../common';
import { AsApiContract } from '../../actions/common';
import { transformAlert, transformRuleType, ApiAlert } from './lib/common_transformations';

export async function loadAlertTypes({ http }: { http: HttpSetup }): Promise<RuleType[]> {
  const res = await http.get<Array<AsApiContract<RuleType>>>(
    `${BASE_ALERTING_API_PATH}/rule_types`
  );
  return res.map((ruleType) => transformRuleType(ruleType));
}

export async function loadAlertType({
  http,
  id,
}: {
  http: HttpSetup;
  id: RuleType['id'];
}): Promise<RuleType | undefined> {
  const ruleTypes = await loadAlertTypes({ http });
  return ruleTypes.find((type) => type.id === id);
}

export async function loadAlert({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<Alert> {
  const res = await http.get<ApiAlert>(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/${alertId}`);
  return transformAlert(res);
}
