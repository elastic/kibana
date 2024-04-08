/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ExperimentalFeatures = typeof allowedExperimentalValues;

/**
 * A list of allowed values that can be used in `xpack.fleet.enableExperimental`.
 * This object is then used to validate and parse the value entered.
 */
export const allowedExperimentalValues = Object.freeze<Record<string, boolean>>({
  createPackagePolicyMultiPageLayout: true,
  packageVerification: true,
  showDevtoolsRequest: true,
  diagnosticFileUploadEnabled: true,
  displayAgentMetrics: true,
  showIntegrationsSubcategories: true,
  agentFqdnMode: true,
  showExperimentalShipperOptions: false,
  agentTamperProtectionEnabled: true,
  secretsStorage: true,
  kafkaOutput: true,
  outputSecretsStorage: true,
  remoteESOutput: true,
  agentless: false,
  enableStrictKQLValidation: false,
  subfeaturePrivileges: false,
  advancedPolicySettings: true,
});

type ExperimentalConfigKeys = Array<keyof ExperimentalFeatures>;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const allowedKeys = Object.keys(allowedExperimentalValues) as Readonly<ExperimentalConfigKeys>;

/**
 * Parses the string value used in `xpack.fleet.enableExperimental` kibana configuration,
 * which should be a string of values delimited by a comma (`,`)
 *
 * @param configValue
 */
export const parseExperimentalConfigValue = (configValue: string[]): ExperimentalFeatures => {
  const enabledFeatures: Mutable<ExperimentalFeatures> = {};

  for (const value of configValue) {
    if (isValidExperimentalValue(value)) {
      enabledFeatures[value] = true;
    }
  }

  return {
    ...allowedExperimentalValues,
    ...enabledFeatures,
  };
};

export const isValidExperimentalValue = (value: string) => {
  return allowedKeys.includes(value);
};

export const getExperimentalAllowedValues = (): string[] => [...allowedKeys];
