/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const CasesStatusResponseRt = rt.type({
  count_open_cases: rt.number,
  count_in_progress_cases: rt.number,
  count_closed_cases: rt.number,
});

export type CasesStatusResponse = rt.TypeOf<typeof CasesStatusResponseRt>;
