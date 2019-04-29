/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { TELEMETRY_READ_ROLES } from '../../../../common/constants';

export function canReadUnencryptedTelemetryData(roles: string[]) {
  return roles.some(role => TELEMETRY_READ_ROLES.some((readRole: string) => readRole === role));
}
