/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { IngestScoresRequestBodyInput } from '@kbn/evals-common';

let counter = 0;

export const uniqueSuffix = (): string => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

const DEFAULT_MODEL = { id: 'gpt-4o', family: 'gpt-4', provider: 'openai' } as const;

export type SeededScore = IngestScoresRequestBodyInput['scores'][number];

export interface BuildScoreOptions {
  exampleId: string;
  exampleIndex: number;
  datasetId: string;
  datasetName: string;
  evaluatorName?: string;
  score?: number | null;
  label?: string;
  repetitionIndex?: number;
  traceId?: string;
}

export const buildScore = (options: BuildScoreOptions): SeededScore => ({
  example: {
    id: options.exampleId,
    index: options.exampleIndex,
    input: { question: `question-${options.exampleId}` },
    dataset: { id: options.datasetId, name: options.datasetName },
  },
  task: {
    repetition_index: options.repetitionIndex ?? 0,
    output: { answer: `answer-${options.exampleId}` },
    ...(options.traceId ? { trace_id: options.traceId } : {}),
  },
  evaluator: {
    name: options.evaluatorName ?? 'correctness',
    score: options.score ?? 1,
    label: options.label ?? 'correct',
    explanation: 'seeded by FTR',
  },
});

export interface BuildScoresRequestBodyOptions {
  experimentId: string;
  experimentName?: string;
  suiteId: string;
  executionId?: string;
  scores: SeededScore[];
}

export const buildScoresRequestBody = (
  options: BuildScoresRequestBodyOptions
): IngestScoresRequestBodyInput => ({
  experiment_id: options.experimentId,
  experiment_name: options.experimentName ?? options.experimentId,
  task_model: { ...DEFAULT_MODEL },
  evaluator_model: { ...DEFAULT_MODEL },
  metadata: {
    total_repetitions: 1,
    hostname: 'ftr-host',
    suite_id: options.suiteId,
    execution_id: options.executionId ?? options.experimentId,
    git: { branch: 'ftr-branch', commit_sha: 'ftrsha' },
  },
  scores: options.scores,
});

export interface SeedTraceSpan {
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind?: string;
  statusCode?: string;
  timestamp: string;
  durationNanos: number;
  attributes?: Record<string, unknown>;
}

// Creates a `traces-*` index (keyword `trace_id` is required for the route's term query) and seeds spans.
// Note: this writes a concrete `traces-*` index, which can clash with data-stream templates on some
// clusters; fine locally, but revisit if the traces suite is ever enabled on MKI (skipMKI today).
export const seedTrace = async (
  esClient: Client,
  index: string,
  traceId: string,
  spans: SeedTraceSpan[]
): Promise<void> => {
  await esClient.indices.create({
    index,
    mappings: {
      properties: {
        trace_id: { type: 'keyword' },
        span_id: { type: 'keyword' },
        parent_span_id: { type: 'keyword' },
        name: { type: 'keyword' },
        kind: { type: 'keyword' },
        status: { type: 'object', properties: { code: { type: 'keyword' } } },
        '@timestamp': { type: 'date' },
        duration: { type: 'long' },
        attributes: { type: 'object', enabled: true },
      },
    },
  });

  await esClient.bulk({
    index,
    refresh: 'wait_for',
    operations: spans.flatMap((span) => [
      { index: {} },
      {
        trace_id: traceId,
        span_id: span.spanId,
        ...(span.parentSpanId ? { parent_span_id: span.parentSpanId } : {}),
        name: span.name,
        ...(span.kind ? { kind: span.kind } : {}),
        ...(span.statusCode ? { status: { code: span.statusCode } } : {}),
        '@timestamp': span.timestamp,
        duration: span.durationNanos,
        attributes: span.attributes ?? {},
      },
    ]),
  });
};
