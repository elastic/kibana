/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep, EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { Detection, SignificantEvent } from '@kbn/significant-events-schema';

/** Fields every discovery agent output carries: the converse trail and trace id. */
export interface AgentOutputBase {
  steps?: ConverseStep[];
  traceId?: string | null;
}

/**
 * Common per-scenario expectations shared by every discovery example's `output`.
 * `criteria` is required because every concrete scenario type defines it, and
 * `createScenarioCriteriaLlmEvaluator` silently falls back to `[]` when it is absent —
 * making it required surfaces missing criteria as a type error rather than a silent no-op.
 */
export interface ExampleOutputBase {
  criteria: EvaluationCriterion[];
}

export interface DiscoveryAgentOutput extends AgentOutputBase {
  significantEvents: SignificantEvent[];
  inputDetections?: Detection[];
}

export interface DiscoveryEvaluationExample {
  input: {
    detections: Array<Partial<Detection>>;
  };
  output: ExampleOutputBase & {
    /**
     * Canonical expected significant events (signals + causal_features + blast_radius + status) —
     * the grouping check derives its expected groups from these events' `signals[].metadata.rule_uuid`s.
     */
    expected_significant_events?: Array<Partial<SignificantEvent>>;
    /** Human-readable summary of expected status outcomes for status-correctness grading. */
    expected_ground_truth?: string;
    /** Expected confirmed rule UUIDs keyed by event ID for confirmation-alignment grading. */
    expected_confirmed_rule_uuids?: Record<string, string[]>;
  } & Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

export type DiscoveryEvaluator = Evaluator<DiscoveryEvaluationExample, DiscoveryAgentOutput>;
