/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConfigSettings {
  /**
   * Security solution internal side navigation enabled
   */
  sideNavEnabled: boolean;
  /**
   * Index Lifecycle Management (ILM) feature enabled.
   */
  ILMEnabled: boolean;
  /**
   * ESQL queries enabled.
   */
  ESQLEnabled: boolean;
}

/**
 * A list of allowed values that can be used in `xpack.securitySolution.settings`.
 * This object is then used to validate and parse the value entered.
 */
export const defaultSettings: ConfigSettings = Object.freeze({
  sideNavEnabled: true,
  ILMEnabled: true,
  ESQLEnabled: true,
});

type ConfigSettingsKey = keyof ConfigSettings;

/**
 * Parses the string value used in `xpack.securitySolution.settings` kibana configuration,
 *
 * @param configSettings
 */
export const parseConfigSettings = (
  configSettings: Record<string, boolean>
): { settings: ConfigSettings; invalid: string[] } => {
  const configSettingsOverride: Partial<ConfigSettings> = {};
  const invalidKeys: string[] = [];

  for (const optionKey in configSettings) {
    if (defaultSettings[optionKey as ConfigSettingsKey] == null) {
      invalidKeys.push(optionKey);
    } else {
      configSettingsOverride[optionKey as ConfigSettingsKey] = configSettings[optionKey];
    }
  }

  const settings: ConfigSettings = Object.freeze({
    ...defaultSettings,
    ...configSettingsOverride,
  });

  return {
    settings,
    invalid: invalidKeys,
  };
};

export const getDefaultConfigSettings = (): ConfigSettings => ({ ...defaultSettings });
