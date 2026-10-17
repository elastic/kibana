/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { Detection } from '@kbn/significant-events-schema';

/** Set to `true` to also run the rules' grounding queries before the agent and send their results. */
export const isPrefetchedGroundingEnabled = (): boolean =>
  process.env.SIGEVENTS_EVAL_PREFETCH_GROUNDING === 'true';

/** Set to `true` to give the discovery agent its KI context in the message, as production does once enabled. */
export const isPrefetchedContextEnabled = (): boolean =>
  process.env.SIGEVENTS_EVAL_PREFETCH_CONTEXT === 'true' || isPrefetchedGroundingEnabled();

const detectionTimes = (detections: Array<Partial<Detection>>) =>
  detections.flatMap(({ rule_uuid: ruleUuid, '@timestamp': detectedAt }) =>
    ruleUuid && detectedAt ? [{ rule_uuid: ruleUuid, detected_at: detectedAt }] : []
  );

/**
 * Fetches the batch's KI context from the same route the workflow calls, or nothing when the
 * evaluation runs the agent without it.
 */
export const fetchPrefetchedContext = async ({
  fetch,
  detections,
}: {
  fetch: HttpHandler;
  detections: Array<Partial<Detection>>;
}): Promise<Record<string, unknown> | undefined> => {
  if (!isPrefetchedContextEnabled()) return undefined;

  const ruleUuids = [...new Set(detections.flatMap(({ rule_uuid: id }) => (id ? [id] : [])))];
  if (ruleUuids.length === 0) return undefined;
  const sourceIds = [
    ...new Set(detections.flatMap(({ source_id: id }) => (typeof id === 'string' ? [id] : []))),
  ];

  return fetch<Record<string, unknown>>('/internal/significant_events/discovery/_context', {
    method: 'POST',
    body: JSON.stringify({
      rule_uuids: ruleUuids,
      source_ids: sourceIds,
      ...(isPrefetchedGroundingEnabled() ? { detections: detectionTimes(detections) } : {}),
    }),
  });
};
