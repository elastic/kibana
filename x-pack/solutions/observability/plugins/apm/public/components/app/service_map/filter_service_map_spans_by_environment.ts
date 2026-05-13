/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapSpan } from '../../../../common/service_map';

/**
 * Drops spans that don't belong to the requested environment.
 *
 * Why this exists: the service map backend pipeline runs in two stages —
 *   1) `getTraceSampleIds` selects trace IDs with at least one doc matching the env
 *      filter (via `environmentQuery`).
 *   2) `fetchExitSpanSamplesFromTraceIds` then pulls **all** spans from those trace
 *      IDs, regardless of each span's own `service.environment`.
 *
 * That second stage leaks cross-env services into the response whenever a single
 * trace participates in multiple environments. Example: opbeans-go (`opbeans`)
 * makes a cross-env call into opbeans-dotnet (`production`); both spans share the
 * same `trace.id`, the trace-ID is picked up by the env filter via opbeans-go,
 * and the opbeans-dotnet span comes along for the ride.
 *
 * Hosts that want strict env scoping (alert details preview) call this before
 * transforming the response to React-Flow. Standalone callers default to off so
 * the existing cross-env trace-topology visualisation keeps working.
 *
 * Filtering rules:
 *  - Spans with **no** source env (unscoped/legacy docs) are kept — we don't have
 *    evidence to drop them.
 *  - Spans whose source env is set and doesn't match are dropped.
 *  - Spans whose destination is a service (`destinationService` populated) and that
 *    destination's env is set and doesn't match are dropped.
 *  - Spans whose destination is a dependency / external resource (no
 *    `destinationService`) are kept regardless — dependencies have no env.
 */
export function filterServiceMapSpansByEnvironment(
  spans: ServiceMapSpan[],
  environment: string
): ServiceMapSpan[] {
  return spans.filter((span) => {
    if (span.serviceEnvironment && span.serviceEnvironment !== environment) {
      return false;
    }
    const destinationEnv = span.destinationService?.serviceEnvironment;
    if (destinationEnv && destinationEnv !== environment) {
      return false;
    }
    return true;
  });
}
