/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetSignalsStatusSchema } from './set_signal_status_route';

export const validateId = (signalStatus: SetSignalsStatusSchema): string[] => {
  if (signalStatus.signal_ids != null && signalStatus.query != null) {
    return ['both "signal_ids" and "query" cannot exist, choose one or the other'];
  } else if (signalStatus.signal_ids == null && signalStatus.query == null) {
    return ['either "signal_ids" or "query" must be set'];
  } else {
    return [];
  }
};

export const setSignalStatusValidateTypeDependents = (schema: SetSignalsStatusSchema): string[] => {
  return [...validateId(schema)];
};
