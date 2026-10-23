/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { InvestigationExample, TrajectoryStep } from '../investigation/types';

/** Probes share the investigation file format; `output.reference_answer` describes a pass. */
export type ConnectorProbeExample = InvestigationExample;

/** What one Nightshift assistant `converse` call produced for a probe question. */
export interface ConnectorProbeTaskOutput {
  case_id: string;
  query: string;
  /** The assistant's final reply. */
  response?: string;
  conversation_id?: string;
  traceId?: string;
  /** Wall-clock time of the `converse` call, which is the whole agent run. */
  duration_ms: number;
  tool_call_trajectory: TrajectoryStep[];
  execution_error?: string;
}

export type ConnectorProbeEvaluator = Evaluator<ConnectorProbeExample, ConnectorProbeTaskOutput>;
