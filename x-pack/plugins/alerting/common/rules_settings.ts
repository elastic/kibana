/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RulesSettingsFlappingProperties,
  RulesSettingsQueryDelayProperties,
} from '@kbn/alerting-types';

export {
  MIN_LOOK_BACK_WINDOW,
  MAX_LOOK_BACK_WINDOW,
  MIN_STATUS_CHANGE_THRESHOLD,
  MAX_STATUS_CHANGE_THRESHOLD,
} from '@kbn/alerting-types/flapping/latest';

export type {
  RulesSettingsModificationMetadata,
  RulesSettingsFlappingProperties,
  RulesSettingsQueryDelayProperties,
  RuleSpecificFlappingProperties,
  RulesSettingsFlapping,
  RulesSettingsQueryDelay,
  RulesSettingsProperties,
  RulesSettings,
} from '@kbn/alerting-types';

export const MIN_QUERY_DELAY = 0;
export const MAX_QUERY_DELAY = 60;

export const RULES_SETTINGS_FEATURE_ID = 'rulesSettings';
export const ALL_FLAPPING_SETTINGS_SUB_FEATURE_ID = 'allFlappingSettings';
export const READ_FLAPPING_SETTINGS_SUB_FEATURE_ID = 'readFlappingSettings';
export const ALL_QUERY_DELAY_SETTINGS_SUB_FEATURE_ID = 'allQueryDelaySettings';
export const READ_QUERY_DELAY_SETTINGS_SUB_FEATURE_ID = 'readQueryDelaySettings';

export const API_PRIVILEGES = {
  READ_FLAPPING_SETTINGS: 'read-flapping-settings',
  WRITE_FLAPPING_SETTINGS: 'write-flapping-settings',
  READ_QUERY_DELAY_SETTINGS: 'read-query-delay-settings',
  WRITE_QUERY_DELAY_SETTINGS: 'write-query-delay-settings',
};

export const RULES_SETTINGS_SAVED_OBJECT_TYPE = 'rules-settings';
export const RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID = 'rules-settings';
export const RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID = 'query-delay-settings';

export const DEFAULT_LOOK_BACK_WINDOW = 20;
export const DEFAULT_STATUS_CHANGE_THRESHOLD = 4;
export const DEFAULT_QUERY_DELAY = 0;
export const DEFAULT_SERVERLESS_QUERY_DELAY = 15;

export const DEFAULT_FLAPPING_SETTINGS: RulesSettingsFlappingProperties = {
  enabled: true,
  lookBackWindow: DEFAULT_LOOK_BACK_WINDOW,
  statusChangeThreshold: DEFAULT_STATUS_CHANGE_THRESHOLD,
};

export const DISABLE_FLAPPING_SETTINGS: RulesSettingsFlappingProperties = {
  ...DEFAULT_FLAPPING_SETTINGS,
  enabled: false,
};

export const DEFAULT_QUERY_DELAY_SETTINGS: RulesSettingsQueryDelayProperties = {
  delay: DEFAULT_QUERY_DELAY,
};
export const DEFAULT_SERVERLESS_QUERY_DELAY_SETTINGS: RulesSettingsQueryDelayProperties = {
  delay: DEFAULT_SERVERLESS_QUERY_DELAY,
};
