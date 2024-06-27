/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignalTypes } from '../../common/entities/types';

export function isApmSignal(signalType: string[]) {
  return signalType.includes(SignalTypes.METRICS);
}
export function isLogsSignal(signalType: string) {
  return signalType.includes(SignalTypes.LOGS) && !signalType.includes(SignalTypes.METRICS);
}
