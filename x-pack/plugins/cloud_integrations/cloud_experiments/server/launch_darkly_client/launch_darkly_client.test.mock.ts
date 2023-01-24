/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LDClient } from 'launchdarkly-node-server-sdk';

export function createLaunchDarklyClientMock(): jest.Mocked<LDClient> {
  return {
    waitForInitialization: jest.fn(),
    variation: jest.fn(),
    allFlagsState: jest.fn(),
    track: jest.fn(),
    flush: jest.fn(),
  } as unknown as jest.Mocked<LDClient>; // Using casting because we only use these APIs. No need to declare everything.
}

export const ldClientMock = createLaunchDarklyClientMock();

jest.doMock('launchdarkly-node-server-sdk', () => ({
  init: () => ldClientMock,
  basicLogger: jest.fn(),
}));
