/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ReportedAlert {
  id: string; // alert instance id
  actionGroup: ['default'];
  state?: Record<string, unknown>;
  context?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

export function report(alert: ReportedAlert) {
  console.log(`alertsClient:report:${JSON.stringify(alert)}`);
}

// function setAlertData(alert: Pick<ReportedAlert, 'id' | 'context' | 'payload'>) {
//   console.log(`setAlertData:${JSON.stringify(alert)}`);
// }

// function getAlertLimitValue() {
//   // TODO Get actual limit
//   return 1000;
// }

// function setAlertLimitReached(reached: boolean) {
//   console.log(`setAlertLimitReached:${reached}`);
// }

// function getRecoveredAlerts() {
//   // TODO return recovered alerts
// }

export const alertsClient = {
  report,
  // setAlertData,
  // getAlertLimitValue,
  // setAlertLimitReached,
  // getRecoveredAlerts,
};
