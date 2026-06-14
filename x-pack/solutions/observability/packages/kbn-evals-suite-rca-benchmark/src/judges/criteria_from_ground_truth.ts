/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RcaGroundTruth } from '../types';

/**
 * Generates LLM-as-judge criteria strings from a ground truth object.
 *
 * These three criteria map directly to the OpenRCA scoring dimensions
 * (component match, reason match, timestamp proximity) but are expressed
 * as natural-language criteria so the @kbn/evals criteria evaluator can score them.
 */
export function createCriteriaFromGroundTruth(groundTruth: RcaGroundTruth): string[] {
  const criteria: string[] = [
    // Component match (corresponds to OpenRCA "component" field)
    `The response identifies "${groundTruth.component}" (or a recognisable synonym, abbreviation, or partial name of it) as the root-cause component or primary suspect — not a different, unrelated service or component`,

    // Reason match (corresponds to OpenRCA "reason" field — semantic, not verbatim)
    `The response describes a failure mode that is semantically equivalent to "${groundTruth.reason}" — exact wording is not required, but the meaning must match and the response must not assert a completely different failure mode`,

    // Evidence grounding (benchmark-agnostic quality gate)
    `The response cites at least one concrete piece of evidence from the telemetry (such as an error message, a metric value, a log excerpt, an error rate, or a query result) to support its root-cause conclusion`,
  ];

  if (groundTruth.timestamp) {
    criteria.push(
      `If the response mentions a timestamp for when the fault began, it is consistent with the incident window — the response must not confidently assert a fault onset time that is far outside the actual incident window`
    );
  }

  return criteria;
}
