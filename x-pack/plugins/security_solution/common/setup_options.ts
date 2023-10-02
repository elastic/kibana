/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type SetupOptionsKey = keyof typeof defaultOptions;
export type SetupOptions = Record<SetupOptionsKey, unknown>;

/**
 * A list of allowed values that can be used in `xpack.securitySolution.setupOptions`.
 * This object is then used to validate and parse the value entered.
 */
export const defaultOptions = Object.freeze({
  /**
   * Enables the security solution internal side navigation
   */
  isSidenavEnabled: true,
});

/**
 * Parses the string value used in `xpack.securitySolution.setupOptions` kibana configuration,
 *
 * @param optionsValue
 */
export const parseSetupOptionsConfig = (
  optionsValue: Record<string, unknown>
): { options: SetupOptions; invalid: string[] } => {
  const configOptions: Partial<Record<SetupOptionsKey, unknown>> = {};
  const invalidKeys: string[] = [];

  for (const optionKey in optionsValue) {
    if (defaultOptions[optionKey as SetupOptionsKey] == null) {
      invalidKeys.push(optionKey);
    } else {
      configOptions[optionKey as SetupOptionsKey] = optionsValue[optionKey];
    }
  }

  const options: SetupOptions = Object.freeze({
    ...defaultOptions,
    ...configOptions,
  });

  return {
    options,
    invalid: invalidKeys,
  };
};

export const getExperimentalAllowedValues = (): SetupOptions => ({ ...defaultOptions });
