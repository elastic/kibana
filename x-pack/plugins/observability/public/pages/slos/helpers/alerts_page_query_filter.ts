/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';

export function toAlertsPageQueryFilter(activeAlerts: ActiveAlerts): string {
  const kuery = activeAlerts.ruleIds
    .map((ruleId) => `kibana.alert.rule.uuid:"${ruleId}"`)
    .join(' or ');

  const query = `(kuery:'${kuery}',rangeFrom:now-15m,rangeTo:now,status:all)`;
  return query;
}
