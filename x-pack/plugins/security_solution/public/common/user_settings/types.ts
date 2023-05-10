/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type UserSettingScope = 'alertsPage' | 'timeline' | 'pageTemplates';

export interface SecuritySolutionUserSetting<T = unknown> {
  [settingId: string]: T;
}

export type SecuritySolutionUserSettingsScope = Record<
  UserSettingScope,
  SecuritySolutionUserSetting
>;

export type SecuritySolutionUserSettings = SecuritySolutionUserSettingsScope;
