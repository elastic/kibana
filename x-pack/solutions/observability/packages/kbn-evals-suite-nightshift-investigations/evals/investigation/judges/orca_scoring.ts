/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The set logic behind the legacy `orca_flags_*` scores, which compare the flags a judge extracted
 * from the structured report with `metadata.plausible_flags`. ORCA's own graders are in
 * `../orca/check_prediction.ts`. Accuracy is 1 when every plausible flag was named. Hallucination
 * is 1 only when the report names at least one cause and none of them is in that set.
 */

interface FlagId {
  key: string;
  variant?: string;
}

/**
 * Splits `key` or `key:variant`. A missing variant matches any variant of that key. Matching
 * ignores case: no two ORCA flag keys differ only by case, so a judge's casing cannot change a score.
 */
const parseFlagId = (value: string): FlagId => {
  const trimmed = value.trim().toLowerCase();
  const separator = trimmed.indexOf(':');
  if (separator <= 0 || separator === trimmed.length - 1) return { key: trimmed };
  return { key: trimmed.slice(0, separator), variant: trimmed.slice(separator + 1) };
};

const flagsMatch = (left: string, right: string): boolean => {
  const a = parseFlagId(left);
  const b = parseFlagId(right);
  if (a.key !== b.key) return false;
  if (a.variant === undefined || b.variant === undefined) return true;
  return a.variant === b.variant;
};

const namesFlag = (named: readonly string[], flag: string): boolean =>
  named.some((cause) => flagsMatch(cause, flag));

/** 1 only when the plausible set is non-empty and every flag in it was named. */
export const scoreOrcaRcaAccuracy = ({
  plausibleFlags,
  namedFlags,
}: {
  plausibleFlags: readonly string[];
  namedFlags: readonly string[];
}): 0 | 1 =>
  plausibleFlags.length > 0 && plausibleFlags.every((flag) => namesFlag(namedFlags, flag)) ? 1 : 0;

/**
 * 1 when the report names at least one cause and none of those causes is a plausible flag.
 * Extra causes alongside a hit stay 0; an empty report stays 0.
 */
export const scoreOrcaHallucination = ({
  plausibleFlags,
  namedCauses,
}: {
  plausibleFlags: readonly string[];
  namedCauses: readonly string[];
}): 0 | 1 => {
  if (namedCauses.length === 0) return 0;
  const hit = namedCauses.some((cause) => namesFlag(plausibleFlags, cause));
  return hit ? 0 : 1;
};
