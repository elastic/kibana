/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEVERITY_OPTIONS, type Severity } from '@kbn/significant-events-schema';

// SEVERITY_OPTIONS must be ordered most-severe first; lower index = higher severity
export const SEVERITY_RANK = new Map<Severity, number>(
  SEVERITY_OPTIONS.map((severity, index) => [severity, index])
);

export const severityRank = (severity: string | undefined): number | undefined => {
  if (!severity || !SEVERITY_RANK.has(severity as Severity)) {
    return undefined;
  }
  return SEVERITY_RANK.get(severity as Severity);
};
