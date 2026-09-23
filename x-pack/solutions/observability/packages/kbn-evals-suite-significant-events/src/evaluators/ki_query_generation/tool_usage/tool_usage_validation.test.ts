/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToolUsageEvaluator } from './tool_usage_validation';

describe('tool_usage_validation evaluator', () => {
  const evaluator = createToolUsageEvaluator();

  it('returns null when no toolUsage in output', async () => {
    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBeNull();
  });

  it('scores full credit when all tools called successfully', async () => {
    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: {
        queries: [],
        toolUsage: {
          get_stream_features: { calls: 1, failures: 0, latency_ms: 100 },
          add_queries: { calls: 2, failures: 0, latency_ms: 200 },
        },
      },
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });
});
