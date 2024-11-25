/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ServerlessExperimentalFeatures = Record<
  keyof typeof allowedExperimentalValues,
  boolean
>;

/**
 * A list of allowed values that can be used in `xpack.dataUsage.enableExperimental`.
 * This object is then used to validate and parse the value entered.
 */
export const allowedExperimentalValues = Object.freeze({
  /**
   * <Add a description of the feature here>
   *
   * [This is a fake feature key to showcase how to add a new serverless-specific experimental flag.
   * It also prevents `allowedExperimentalValues` from being empty. It should be removed once a real feature is added.]
   */
  dataUsageDisabled: false,
});

type ServerlessExperimentalConfigKeys = Array<keyof ServerlessExperimentalFeatures>;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const allowedKeys = Object.keys(
  allowedExperimentalValues
) as Readonly<ServerlessExperimentalConfigKeys>;

export type ExperimentalFeatures = ServerlessExperimentalFeatures;
/**
 * Parses the string value used in `xpack.dataUsage.enableExperimental` kibana configuration,
 * which should be a string of values delimited by a comma (`,`)
 * The generic experimental features are merged with the serverless values to ensure they are available
 *
 * @param configValue
 * @throws DataUsagenvalidExperimentalValue
 */
export const parseExperimentalConfigValue = (
  configValue: string[]
): { features: ExperimentalFeatures; invalid: string[] } => {
  const enabledFeatures: Mutable<Partial<ExperimentalFeatures>> = {};
  const invalidKeys: string[] = [];

  for (const value of configValue) {
    if (!allowedKeys.includes(value as keyof ServerlessExperimentalFeatures)) {
      invalidKeys.push(value);
    } else {
      enabledFeatures[value as keyof ServerlessExperimentalFeatures] = true;
    }
  }

  return {
    features: {
      ...allowedExperimentalValues,
      ...enabledFeatures,
    },
    invalid: invalidKeys,
  };
};

export const getExperimentalAllowedValues = (): string[] => [...allowedKeys];
