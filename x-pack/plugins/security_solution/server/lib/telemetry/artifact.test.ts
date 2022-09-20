/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockTelemetryReceiver } from './__mocks__';
import { artifactService } from './artifact';

describe('telemetry artifact test', () => {
  test('diagnostics telemetry task should query and enqueue events', async () => {
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    await artifactService.start(mockTelemetryReceiver);
    expect(mockTelemetryReceiver.fetchClusterInfo).toHaveBeenCalled();
  });
});
