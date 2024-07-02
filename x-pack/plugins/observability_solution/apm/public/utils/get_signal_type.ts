/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignalTypes } from '../../common/entities/types';

export function isApmSignal(signalTypes: SignalTypes[]) {
  return signalTypes.includes(SignalTypes.METRICS) || signalTypes.includes(SignalTypes.TRACES);
}
export function isLogsSignal(signalTypes: SignalTypes[]) {
  return signalTypes.includes(SignalTypes.LOGS) && !isApmSignal(signalTypes);
}
