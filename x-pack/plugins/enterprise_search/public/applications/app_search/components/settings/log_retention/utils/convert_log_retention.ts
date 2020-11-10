/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ELogRetentionOptions,
  ILogRetention,
  ILogRetentionPolicy,
  ILogRetentionServer,
  ILogRetentionServerPolicy,
  ILogRetentionServerSettings,
  ILogRetentionSettings,
} from '../types';

export const convertLogRetentionFromServerToClient = (
  logRetention: ILogRetentionServer
): ILogRetention => ({
  [ELogRetentionOptions.Analytics]: convertLogRetentionSettingsFromServerToClient(
    logRetention[ELogRetentionOptions.Analytics]
  ),
  [ELogRetentionOptions.API]: convertLogRetentionSettingsFromServerToClient(
    logRetention[ELogRetentionOptions.API]
  ),
});

const convertLogRetentionSettingsFromServerToClient = ({
  disabled_at: disabledAt,
  enabled,
  retention_policy: retentionPolicy,
}: ILogRetentionServerSettings): ILogRetentionSettings => ({
  disabledAt,
  enabled,
  retentionPolicy:
    retentionPolicy === null ? null : convertLogRetentionPolicyFromServerToClient(retentionPolicy),
});

const convertLogRetentionPolicyFromServerToClient = ({
  min_age_days: minAgeDays,
  is_default: isDefault,
}: ILogRetentionServerPolicy): ILogRetentionPolicy => ({
  isDefault,
  minAgeDays,
});
