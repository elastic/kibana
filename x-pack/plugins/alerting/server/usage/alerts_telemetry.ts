/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsTelemetry, AlertsTelemetrySavedObject } from './types';

export const ALERTS_TELEMETRY_DOC_ID = 'alerts-telemetry';

export function createAlertsTelemetry(
  executionsByAlertType: Record<string, number> = {}
): AlertsTelemetry {
  return {
    excutions_count_by_type: executionsByAlertType,
  };
}
// savedObjects
export function storeAlertsTelemetry(
  savedObjectsClient: any,
  alertsTelemetry: AlertsTelemetry
): void {
  savedObjectsClient.create('alerts-telemetry', alertsTelemetry, {
    id: ALERTS_TELEMETRY_DOC_ID,
    overwrite: true,
  });
}

export async function incrementAlertsExecutionsCount(
  savedObjectsClient: any,
  alertType: string
): Promise<void> {
  try {
    const { attributes } = await savedObjectsClient.get('telemetry', 'telemetry');
    if (attributes.enabled === false) {
      return;
    }
  } catch (error) {
    // if we aren't allowed to get the telemetry document,
    // we assume we couldn't opt in to telemetry and won't increment the index count.
    return;
  }

  let executionsByAlertTypes = {};

  try {
    const { attributes } = (await savedObjectsClient.get(
      'alerts-telemetry',
      ALERTS_TELEMETRY_DOC_ID
    )) as AlertsTelemetrySavedObject;
    const executionsByAlertType = attributes.excutions_count_by_type[alertType]
      ? attributes.excutions_count_by_type[alertType]
      : 0;
    executionsByAlertTypes = {
      ...attributes.excutions_count_by_type,
      [alertType]: executionsByAlertType + 1,
    };
  } catch (e) {
    /* silently fail, this will happen if the saved object doesn't exist yet. */
  }

  const alertsTelemetry = createAlertsTelemetry(executionsByAlertTypes);
  storeAlertsTelemetry(savedObjectsClient, alertsTelemetry);
}
