/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMlTelemetry } from '../ml_telemetry';

describe('ml_telemetry', () => {
  describe('createMlTelemetry', () => {
    it('should create a MlTelemetry object', () => {
      const mlTelemetry = createMlTelemetry(1);
      expect(mlTelemetry.file_data_visualizer_indices_count).toBe(1);
    });
    it('should ignore undefined or unknown values', () => {
      const mlTelemetry = createMlTelemetry(undefined);
      expect(mlTelemetry.file_data_visualizer_indices_count).toBe(0);
    });
  });
});
