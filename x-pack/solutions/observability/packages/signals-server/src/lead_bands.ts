/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LeadSignalBand, LeadTimingBand } from '@kbn/signal-investigation-contract';

/** Bands an Elasticsearch change_point p-value. Other techniques use their own score thresholds. */
export const changePointSignalBand = (pValue: number | undefined): LeadSignalBand => {
  if (pValue === undefined || Number.isNaN(pValue)) {
    return 'unknown';
  }
  if (pValue < 0.01) {
    return 'strong';
  }
  if (pValue < 0.05) {
    return 'moderate';
  }
  return 'weak';
};

/** Bands an ML anomaly record_score (0 to 100) into strong, moderate, or weak signal strength. */
export const anomalySignalBand = (score: number | string | null | undefined): LeadSignalBand => {
  const numeric = typeof score === 'string' ? Number(score) : score;
  if (numeric === undefined || numeric === null || !Number.isFinite(numeric) || numeric <= 0) {
    return 'unknown';
  }
  if (numeric >= 50) {
    return 'strong';
  }
  if (numeric >= 25) {
    return 'moderate';
  }
  return 'weak';
};

/** Places a lead's timestamp before, during, or after the anchor window. */
export const timingBand = (
  occurredAt: string | undefined,
  anchorStart: string,
  anchorEnd: string
): LeadTimingBand => {
  const at = occurredAt ? Date.parse(occurredAt) : NaN;
  const start = Date.parse(anchorStart);
  const end = Date.parse(anchorEnd);
  if (!Number.isFinite(at) || !Number.isFinite(end)) {
    return 'unknown';
  }
  if (Number.isFinite(start) && at >= start && at <= end) {
    return 'during';
  }
  return at < end ? 'before' : 'after';
};
