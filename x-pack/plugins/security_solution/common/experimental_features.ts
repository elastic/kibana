/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ExperimentalFeatures = typeof allowedExperimentalValues;

/**
 * A list of allowed values that can be used in `xpack.securitySolution.enableExperimental`.
 * This object is then used to validate and parse the value entered.
 */
const allowedExperimentalValues = Object.freeze({
  fleetServerEnabled: false,
});

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const SecuritySolutionInvalidExperimentalValueError = class extends Error {};

/**
 * A Map of allowed experimental values in uppercase (for data normalization purposes) to an object
 * containing internal information about the value (currently only the non-uppercased key).
 * Used for validation of values entered via the plugin config setting.
 */
const allowedKeys = (Object.keys(allowedExperimentalValues) as Array<
  keyof ExperimentalFeatures
>).reduce((map, key) => {
  map.set(key.toUpperCase(), { key });
  return map;
}, new Map<string, { key: keyof ExperimentalFeatures }>());

/**
 * Parses the string value used in `xpack.securitySolution.enableExperimental` kibana configuration,
 * which should be a string of values delimited by a comma (`,`)
 *
 * @param configValue
 * @throws SecuritySolutionInvalidExperimentalValue
 */
export const parseExperimentalConfigValue = (configValue: string): ExperimentalFeatures => {
  const stringValues = configValue
    .split(/,/)
    .filter(Boolean)
    .map((value) => value.trim());
  const enabledFeatures: Mutable<Partial<ExperimentalFeatures>> = {};

  for (const value of stringValues) {
    const allowedKey = allowedKeys.get(value.toUpperCase());

    if (!allowedKey) {
      throw new SecuritySolutionInvalidExperimentalValueError(
        `[${value}] is not a valid value for 'xpack.securitySolution.enableExperimental'. Valid values are: ${Object.keys(
          allowedExperimentalValues
        ).join(', ')}`
      );
    } else {
      enabledFeatures[allowedKey.key] = true;
    }
  }

  return {
    ...allowedExperimentalValues,
    ...enabledFeatures,
  };
};
