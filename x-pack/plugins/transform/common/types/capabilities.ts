/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getInitialTransformCapabilities = (initialSetting = false) => ({
  canCreateTransform: initialSetting,
  canCreateTransformAlerts: initialSetting,
  canDeleteIndex: initialSetting,
  canDeleteTransform: initialSetting,
  canGetTransform: initialSetting,
  canPreviewTransform: initialSetting,
  canReauthorizeTransform: initialSetting,
  canResetTransform: initialSetting,
  canScheduleNowTransform: initialSetting,
  canStartStopTransform: initialSetting,
  canUseTransformAlerts: initialSetting,
});

export type TransformCapabilities = ReturnType<typeof getInitialTransformCapabilities>;
export type TransformCapability = keyof TransformCapabilities;

export interface PrivilegesAndCapabilities {
  privileges: Privileges;
  capabilities: TransformCapabilities;
}

export type Privilege = [string, string];

export interface MissingPrivileges {
  [key: string]: string[] | undefined;
}

export interface Privileges {
  hasAllPrivileges: boolean;
  missingPrivileges: MissingPrivileges;
}
