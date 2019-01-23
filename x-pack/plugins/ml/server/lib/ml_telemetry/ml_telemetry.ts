/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface MlTelemetry {
  file_data_visualizer_indices_count: number;
}

export function createMlTelemetry(count: number = 0): MlTelemetry {
  return {
    file_data_visualizer_indices_count: count,
  };
}
