export interface ReportedAlert {
  id: string; // alert instance id
  actionGroup: ['default'];
  state?: Record<string, unknown>;
  context?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

export function reportAlert(alert: ReportedAlert) {
  console.log(`createAlert:${JSON.stringify(alert)}`);
}
