/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { LEGACY_BASE_ALERT_API_PATH } from '../common';
import type { Alert, AlertType } from '../common';

export async function loadRuleTypes({ http }: { http: HttpSetup }): Promise<AlertType[]> {
  return await http.get(`${LEGACY_BASE_ALERT_API_PATH}/list_alert_types`);
}

export async function loadRule({
  http,
  ruleId,
}: {
  http: HttpSetup;
  ruleId: string;
}): Promise<Alert> {
  return await http.get(`${LEGACY_BASE_ALERT_API_PATH}/alert/${ruleId}`);
}
