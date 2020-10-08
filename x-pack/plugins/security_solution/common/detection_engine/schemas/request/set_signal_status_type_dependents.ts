/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SetSignalsStatusSchema } from './set_signal_status_schema';

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
