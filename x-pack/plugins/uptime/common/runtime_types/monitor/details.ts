/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

// IO type for validation
export const PingErrorType = t.intersection([
  t.partial({
    code: t.string,
    id: t.string,
    stack_trace: t.string,
    type: t.string,
  }),
  t.type({
    // this is _always_ on the error field
    message: t.string,
  }),
]);

// Typescript type for type checking
export type PingError = t.TypeOf<typeof PingErrorType>;

export const MonitorDetailsType = t.intersection([
  t.type({ monitorId: t.string }),
  t.partial({ error: PingErrorType, timestamp: t.string, alerts: t.unknown }),
]);
export type MonitorDetails = t.TypeOf<typeof MonitorDetailsType>;
