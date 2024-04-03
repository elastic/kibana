/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ExperimentalFeatures = { [K in keyof typeof allowedExperimentalValues]: boolean };

/**
 * A list of allowed values that can be used in `xpack.trigger_actions_ui.enableExperimental`.
 * This object is then used to validate and parse the value entered.
 */
export const allowedExperimentalValues = Object.freeze({
  rulesListDatagrid: true,
  globalAlertsPage: false,
  ruleTagFilter: true,
  ruleStatusFilter: true,
  rulesDetailLogs: true,
  ruleUseExecutionStatus: false,
  ruleKqlBar: false,
  isMustacheAutocompleteOn: false,
  showMustacheAutocompleteSwitch: false,
  ruleFormV2: false,
});

type ExperimentalConfigKeys = Array<keyof ExperimentalFeatures>;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const TriggersActionsUIInvalidExperimentalValue = class extends Error {};
const allowedKeys = Object.keys(allowedExperimentalValues) as Readonly<ExperimentalConfigKeys>;

/**
 * Parses the string value used in `xpack.trigger_actions_ui.enableExperimental` kibana configuration,
 * which should be a string of values delimited by a comma (`,`):
 * xpack.trigger_actions_ui.enableExperimental: ['ruleStatusFilter', 'ruleTagFilter']
 *
 * @param configValue
 * @throws TriggersActionsUIInvalidExperimentalValue
 */
export const parseExperimentalConfigValue = (configValue: string[]): ExperimentalFeatures => {
  const enabledFeatures: Mutable<Partial<ExperimentalFeatures>> = {};

  for (const value of configValue) {
    if (!isValidExperimentalValue(value)) {
      throw new TriggersActionsUIInvalidExperimentalValue(`[${value}] is not valid.`);
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
