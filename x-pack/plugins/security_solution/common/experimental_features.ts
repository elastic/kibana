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
export const allowedExperimentalValues = Object.freeze({
  metricsEntitiesEnabled: false,
  ruleRegistryEnabled: true,
  tGridEnabled: true,
  tGridEventRenderedViewEnabled: true,
  excludePoliciesInFilterEnabled: false,
  uebaEnabled: false,
  disableIsolationUIPendingStatuses: false,
  riskyHostsEnabled: false,
  securityRulesCancelEnabled: false,
  pendingActionResponsesWithAck: true,
  rulesBulkEditEnabled: false,
  policyListEnabled: false,
});

type ExperimentalConfigKeys = Array<keyof ExperimentalFeatures>;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const SecuritySolutionInvalidExperimentalValue = class extends Error {};
const allowedKeys = Object.keys(allowedExperimentalValues) as Readonly<ExperimentalConfigKeys>;

/**
 * Parses the string value used in `xpack.securitySolution.enableExperimental` kibana configuration,
 * which should be a string of values delimited by a comma (`,`)
 *
 * @param configValue
 * @throws SecuritySolutionInvalidExperimentalValue
 */
export const parseExperimentalConfigValue = (configValue: string[]): ExperimentalFeatures => {
  const enabledFeatures: Mutable<Partial<ExperimentalFeatures>> = {};

  for (const value of configValue) {
    if (!isValidExperimentalValue(value)) {
      throw new SecuritySolutionInvalidExperimentalValue(`[${value}] is not valid.`);
    }

    enabledFeatures[value as keyof ExperimentalFeatures] = true;
  }

  return {
    ...allowedExperimentalValues,
    ...enabledFeatures,
  };
};

export const isValidExperimentalValue = (value: string): boolean => {
  return allowedKeys.includes(value as keyof ExperimentalFeatures);
};

export const getExperimentalAllowedValues = (): string[] => [...allowedKeys];
