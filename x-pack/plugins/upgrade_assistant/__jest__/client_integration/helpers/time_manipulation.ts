/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

/**
 * These helpers are intended to be used in conjunction with jest.useFakeTimers().
 */

const flushPromiseJobQueue = async () => {
  // See https://stackoverflow.com/questions/52177631/jest-timer-and-promise-dont-work-well-settimeout-and-async-function
  await Promise.resolve();
};

export const advanceTime = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await flushPromiseJobQueue();
  });
};
