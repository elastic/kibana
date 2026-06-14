/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';

/**
 * Ground truth for one RCA eval scenario.
 * Mirrors the field structure from OpenRCA and RCAEval benchmarks.
 */
export interface RcaGroundTruth {
  /** Service or component that is the root cause (e.g. "paymentservice") */
  component: string;
  /** Human-readable description of the failure mode */
  reason: string;
  /**
   * ISO-8601 timestamp of the fault injection / incident start.
   * Optional — not all benchmark datasets provide this.
   */
  timestamp?: string;
}

/**
 * A single RCA evaluation example. One example = one agent investigation run.
 */
export interface RcaExample extends Example {
  input: {
    /** Natural language question sent to the agent */
    question: string;
    /** Stream name in ES (e.g. "logs.rca-bench.otel-demo.payment-unreachable") */
    streamName: string;
    /** Incident time window */
    timeRange: { from: string; to: string };
  };
  output: {
    groundTruth: RcaGroundTruth;
    /**
     * LLM-as-judge criteria that must all pass.
     * Used in addition to the ground-truth component/reason matching.
     */
    criteria?: string[];
  };
  metadata: {
    /** Which eval mode produced this case (a = direct conv, b = sig events + conv) */
    mode: 'a' | 'b';
    /** Source benchmark for traceability */
    benchmark: 'rcaeval' | 'openrca' | 'otel-demo';
    /** Opaque case identifier from the upstream benchmark */
    caseId: string;
  };
}

/** Shape returned from the agent conversation task */
export interface RcaTaskOutput {
  /** Raw final response from the agent */
  responseText: string;
  /** Tool calls extracted from steps */
  toolCalls: string[];
  /** Conversation ID (for multi-turn follow-ups) */
  conversationId?: string;
  traceId?: string;
  errors: unknown[];
}

export type EvaluateRcaDataset = (params: {
  dataset: {
    name: string;
    description: string;
    examples: RcaExample[];
  };
}) => Promise<void>;
