/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEventsSender } from '../sender';

/**
 * Creates a mocked Telemetry Events Sender
 */
export const createMockTelemetryEventsSender = (
  enableTelemetry?: boolean
): jest.Mocked<TelemetryEventsSender> => {
  return {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    fetchTelemetryUrl: jest.fn(),
    queueTelemetryEvents: jest.fn(),
    isTelemetryOptedIn: jest.fn().mockReturnValue(enableTelemetry ?? jest.fn()),
    sendIfDue: jest.fn(),
    sendEvents: jest.fn(),
  } as unknown as jest.Mocked<TelemetryEventsSender>;
};
