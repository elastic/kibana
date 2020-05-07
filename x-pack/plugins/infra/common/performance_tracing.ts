/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import uuid from 'uuid';

export const tracingSpanRT = rt.type({
  duration: rt.number,
  id: rt.string,
  name: rt.string,
  start: rt.number,
});

export type TracingSpan = rt.TypeOf<typeof tracingSpanRT>;

export type ActiveTrace = (endTime?: number) => TracingSpan;

export const startTracingSpan = (name: string): ActiveTrace => {
  const initialState: TracingSpan = {
    duration: Number.POSITIVE_INFINITY,
    id: uuid.v4(),
    name,
    start: Date.now(),
  };

  return (endTime: number = Date.now()) => ({
    ...initialState,
    duration: endTime - initialState.start,
  });
};
