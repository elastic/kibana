/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertLogRetentionFromServerToClient } from './convert_log_retention';

describe('convertLogRetentionFromServerToClient', () => {
  it('converts log retention from server to client', () => {
    expect(
      convertLogRetentionFromServerToClient({
        analytics: {
          disabled_at: null,
          enabled: true,
          retention_policy: { is_default: true, min_age_days: 180 },
        },
        api: {
          disabled_at: null,
          enabled: true,
          retention_policy: { is_default: true, min_age_days: 180 },
        },
        audit: {
          disabled_at: null,
          enabled: true,
          retention_policy: { is_default: true, min_age_days: 180 },
        },
        crawler: {
          disabled_at: null,
          enabled: true,
          retention_policy: { is_default: true, min_age_days: 180 },
        },
      })
    ).toEqual({
      analytics: {
        disabledAt: null,
        enabled: true,
        retentionPolicy: { isDefault: true, minAgeDays: 180 },
      },
      api: {
        disabledAt: null,
        enabled: true,
        retentionPolicy: { isDefault: true, minAgeDays: 180 },
      },
      audit: {
        disabledAt: null,
        enabled: true,
        retentionPolicy: { isDefault: true, minAgeDays: 180 },
      },
      crawler: {
        disabledAt: null,
        enabled: true,
        retentionPolicy: { isDefault: true, minAgeDays: 180 },
      },
    });
  });

  it('handles null retention policies and null min_age_days', () => {
    expect(
      convertLogRetentionFromServerToClient({
        analytics: {
          disabled_at: null,
          enabled: true,
          retention_policy: null,
        },
        api: {
          disabled_at: null,
          enabled: true,
          retention_policy: { is_default: true, min_age_days: null },
        },
        audit: {
          disabled_at: null,
          enabled: true,
          retention_policy: { is_default: true, min_age_days: null },
        },
        crawler: {
          disabled_at: null,
          enabled: true,
          retention_policy: { is_default: true, min_age_days: null },
        },
      })
    ).toEqual({
      analytics: {
        disabledAt: null,
        enabled: true,
        retentionPolicy: null,
      },
      api: {
        disabledAt: null,
        enabled: true,
        retentionPolicy: { isDefault: true, minAgeDays: null },
      },
      audit: {
        disabledAt: null,
        enabled: true,
        retentionPolicy: { isDefault: true, minAgeDays: null },
      },
      crawler: {
        disabledAt: null,
        enabled: true,
        retentionPolicy: { isDefault: true, minAgeDays: null },
      },
    });
  });
});
