/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const InfraProfilingFlamegraphRequestParamsRT = rt.type({
  hostname: rt.string,
  from: rt.number,
  to: rt.number,
});

export const InfraProfilingFunctionsRequestParamsRT = rt.type({
  hostname: rt.string,
  from: rt.number,
  to: rt.number,
  startIndex: rt.number,
  endIndex: rt.number,
});

export type InfraProfilingFlamegraphRequestParams = rt.TypeOf<
  typeof InfraProfilingFlamegraphRequestParamsRT
>;

export type InfraProfilingFunctionsRequestParams = rt.TypeOf<
  typeof InfraProfilingFunctionsRequestParamsRT
>;
