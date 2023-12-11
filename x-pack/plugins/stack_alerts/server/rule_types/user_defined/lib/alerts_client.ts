export interface ReportedAlert {
  id: string; // alert instance id
  actionGroup: ['default'];
  state?: Record<string, unknown>;
  context?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

export function reportAlert(alert: ReportedAlert) {
  console.log(`reportAlert:${JSON.stringify(alert)}`);
}

function setAlertData(alert: Pick<ReportedAlert, 'id' | 'context' | 'payload'>) {
  console.log(`setAlertData:${JSON.stringify(alert)}`);
}

function getAlertLimitValue() {
  // TODO Get actual limit
  return 1000;
}

function setAlertLimitReached(reached: boolean) {
  console.log(`setAlertLimitReached:${reached}`);
}

function getRecoveredAlerts() {
  // TODO return recovered alerts
}

export const alertsClient = {
  reportAlert,
  setAlertData,
  getAlertLimitValue,
  setAlertLimitReached,
  getRecoveredAlerts,
};
