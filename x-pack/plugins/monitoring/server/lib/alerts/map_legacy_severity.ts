/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertSeverity } from '../../../common/enums';

export function mapLegacySeverity(severity: number) {
  const floor = Math.floor(severity / 1000);
  if (floor <= 1) {
    return AlertSeverity.Warning;
  }
  return AlertSeverity.Danger;
}
