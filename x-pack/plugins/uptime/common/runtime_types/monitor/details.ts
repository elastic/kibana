/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

// IO type for validation
export const MonitorErrorType = t.partial({
  code: t.number,
  message: t.string,
  type: t.string,
});

// Typescript type for type checking
export type MonitorError = t.TypeOf<typeof MonitorErrorType>;

export const MonitorDetailsType = t.intersection([
  t.type({ monitorId: t.string }),
  t.partial({ error: MonitorErrorType, timestamp: t.string, alerts: t.unknown }),
]);
export type MonitorDetails = t.TypeOf<typeof MonitorDetailsType>;
