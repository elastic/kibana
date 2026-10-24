/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ORCA's set-based scores. `goal_pass` still scores the single best hypothesis; these do not.
 * Hallucination is 1 when a named cause is outside the plausible set (a minimize metric).
 */

const includesFlag = (named: readonly string[], flag: string): boolean =>
  named.some((cause) => cause === flag);

/** 1 only when the plausible set is non-empty and every flag in it was named. */
export const scoreOrcaRcaAccuracy = ({
  plausibleFlags,
  namedFlags,
}: {
  plausibleFlags: readonly string[];
  namedFlags: readonly string[];
}): 0 | 1 =>
  plausibleFlags.length > 0 && plausibleFlags.every((flag) => includesFlag(namedFlags, flag))
    ? 1
    : 0;

/** 1 when any named cause matches none of the plausible set. */
export const scoreOrcaHallucination = ({
  plausibleFlags,
  namedCauses,
}: {
  plausibleFlags: readonly string[];
  namedCauses: readonly string[];
}): 0 | 1 => (namedCauses.some((cause) => !includesFlag(plausibleFlags, cause)) ? 1 : 0);

/** 1 when the report is empty or places no incident inside the quiet window. */
export const scoreOrcaControl = ({
  emptyReport,
  incidentInsideQuietWindow,
}: {
  emptyReport: boolean;
  incidentInsideQuietWindow: boolean;
}): 0 | 1 => {
  if (emptyReport) return 1;
  return incidentInsideQuietWindow ? 0 : 1;
};
