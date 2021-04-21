/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';

export interface AlertData {
  'rule.id': string;
  'kibana.rac.alert.value': number;
  'rule.name': string;
  'kibana.rac.alert.duration.us': number;
  'kibana.rac.alert.end': string;
  'kibana.rac.alert.threshold': number;
  'kibana.rac.alert.status': string;
  'kibana.rac.alert.uuid': string;
  'rule.uuid': string;
  'event.action': string;
  '@timestamp': string;
  'kibana.rac.alert.id': string;
  'kibana.rac.alert.start': string;
  'kibana.rac.producer': string;
  'event.kind': string;
  'rule.category': string;
}

export async function loadAlertData({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<AlertData[]> {
  return await http.get(`/internal/stack_alerts/rule/${alertId}/_alert_data`);
}
