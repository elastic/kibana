/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConfigSettings {
  /**
   * Index Lifecycle Management (ILM) feature enabled.
   */
  ILMEnabled: boolean;
}

/**
 * A list of allowed values that can be override in `xpack.securitySolution.offeringSettings`.
 * This object is then used to validate and parse the value entered.
 */
export const defaultSettings: ConfigSettings = Object.freeze({
  ILMEnabled: true,
});

type ConfigSettingsKey = keyof ConfigSettings;

/**
 * Parses the string value used in `xpack.securitySolution.offeringSettings` kibana configuration,
 *
 * @param offeringSettings
 */
export const parseConfigSettings = (
  offeringSettings: Record<string, boolean>
): { settings: ConfigSettings; invalid: string[] } => {
  const configSettings: Partial<ConfigSettings> = {};
  const invalidKeys: string[] = [];

  for (const optionKey in offeringSettings) {
    if (defaultSettings[optionKey as ConfigSettingsKey] == null) {
      invalidKeys.push(optionKey);
    } else {
      configSettings[optionKey as ConfigSettingsKey] = offeringSettings[optionKey];
    }
  }

  const settings: ConfigSettings = Object.freeze({
    ...defaultSettings,
    ...configSettings,
  });

  return {
    settings,
    invalid: invalidKeys,
  };
};

export const getDefaultConfigSettings = (): ConfigSettings => ({ ...defaultSettings });
