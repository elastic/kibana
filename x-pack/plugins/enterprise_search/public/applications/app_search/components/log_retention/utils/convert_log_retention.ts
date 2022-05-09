/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogRetentionOptions,
  LogRetention,
  LogRetentionPolicy,
  LogRetentionServer,
  LogRetentionServerPolicy,
  LogRetentionServerSettings,
  LogRetentionSettings,
} from '../types';

export const convertLogRetentionFromServerToClient = (
  logRetention: LogRetentionServer
): LogRetention => ({
  [LogRetentionOptions.Analytics]: convertLogRetentionSettingsFromServerToClient(
    logRetention[LogRetentionOptions.Analytics]
  ),
  [LogRetentionOptions.API]: convertLogRetentionSettingsFromServerToClient(
    logRetention[LogRetentionOptions.API]
  ),
  [LogRetentionOptions.Audit]: convertLogRetentionSettingsFromServerToClient(
    logRetention[LogRetentionOptions.Audit]
  ),
  [LogRetentionOptions.Crawler]: convertLogRetentionSettingsFromServerToClient(
    logRetention[LogRetentionOptions.Crawler]
  ),
});

const convertLogRetentionSettingsFromServerToClient = ({
  disabled_at: disabledAt,
  enabled,
  retention_policy: retentionPolicy,
}: LogRetentionServerSettings): LogRetentionSettings => ({
  disabledAt,
  enabled,
  retentionPolicy:
    retentionPolicy === null ? null : convertLogRetentionPolicyFromServerToClient(retentionPolicy),
});

const convertLogRetentionPolicyFromServerToClient = ({
  min_age_days: minAgeDays,
  is_default: isDefault,
}: LogRetentionServerPolicy): LogRetentionPolicy => ({
  isDefault,
  minAgeDays,
});
