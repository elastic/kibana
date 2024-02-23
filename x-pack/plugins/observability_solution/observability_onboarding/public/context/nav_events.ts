/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type NavEventType = 'inital' | 'back' | 'progress';

export interface NavEvent<StepKey extends string> {
  type: NavEventType;
  step: StepKey;
  timestamp: number;
  duration: number;
}

const createEvent = <StepKey extends string>({
  type,
  step,
  timestamp,
}: {
  type: NavEventType;
  step: StepKey;
  timestamp?: number;
}) => ({
  type,
  step,
  timestamp: timestamp ?? Date.now(),
  duration: 0,
});

export const generateNavEvents = <StepKey extends string>({
  type,
  step,
  navEvents,
}: {
  type: NavEventType;
  step: StepKey;
  navEvents: Array<NavEvent<StepKey>>;
}) => {
  if (navEvents.length === 0) {
    return [createEvent({ type: 'inital', step })];
  }

  const mutableNavEvents = [...navEvents];
  const previousEvent = mutableNavEvents[navEvents.length - 1];
  const timestamp = Date.now();
  previousEvent.duration = timestamp - previousEvent.timestamp;

  return [
    ...mutableNavEvents,
    createEvent({
      type,
      step,
      timestamp,
    }),
  ];
};
