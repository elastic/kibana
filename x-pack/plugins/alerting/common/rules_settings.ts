/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export interface RulesSettingsModificationMetadata {
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RulesSettingsFlappingProperties {
  enabled: boolean;
  lookBackWindow: number;
  statusChangeThreshold: number;
}

export type RulesSettingsFlapping = RulesSettingsFlappingProperties &
  RulesSettingsModificationMetadata;

export interface RulesSettings {
  flapping: RulesSettingsFlapping;
}

export const MIN_LOOK_BACK_WINDOW = 2;
export const MAX_LOOK_BACK_WINDOW = 20;
export const MIN_STATUS_CHANGE_THRESHOLD = 2;
export const MAX_STATUS_CHANGE_THRESHOLD = 20;

export const RULES_SETTINGS_FEATURE_ID = 'rulesSettings';
export const ALL_FLAPPING_SETTINGS_SUB_FEATURE_ID = 'allFlappingSettings';
export const READ_FLAPPING_SETTINGS_SUB_FEATURE_ID = 'readFlappingSettings';

export const API_PRIVILEGES = {
  READ_FLAPPING_SETTINGS: 'read-flapping-settings',
  WRITE_FLAPPING_SETTINGS: 'write-flapping-settings',
};

export const RULES_SETTINGS_SAVED_OBJECT_TYPE = 'rules-settings';
export const RULES_SETTINGS_SAVED_OBJECT_ID = 'rules-settings';

export const DEFAULT_LOOK_BACK_WINDOW = 20;
export const DEFAULT_STATUS_CHANGE_THRESHOLD = 4;

export const DEFAULT_FLAPPING_SETTINGS: RulesSettingsFlappingProperties = {
  enabled: true,
  lookBackWindow: 20,
  statusChangeThreshold: 4,
};
