/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyConfig } from '../types';
import { ProtectionModes } from '../types';

/**
 * Returns a copy of the passed `PolicyConfig` with all protections set to disabled.
 *
 * @param policy
 * @returns
 */
export const disableProtections = (policy: PolicyConfig): PolicyConfig => {
  const result = disableCommonProtections(policy);

  return {
    ...result,
    windows: {
      ...result.windows,
      ...getDisabledWindowsSpecificProtections(result),
      popup: {
        ...result.windows.popup,
        ...getDisabledWindowsSpecificPopups(result),
      },
    },
  };
};

const disableCommonProtections = (policy: PolicyConfig) => {
  return Object.keys(policy).reduce<PolicyConfig>((acc, item) => {
    const os = item as keyof PolicyConfig;
    if (os === 'meta') {
      return acc;
    }
    return {
      ...acc,
      [os]: {
        ...policy[os],
        ...getDisabledCommonProtectionsForOS(policy, os),
        popup: {
          ...policy[os].popup,
          ...getDisabledCommonPopupsForOS(policy, os),
        },
      },
    };
  }, policy);
};

const getDisabledCommonProtectionsForOS = (
  policy: PolicyConfig,
  os: keyof Omit<PolicyConfig, 'meta'>
) => ({
  behavior_protection: {
    ...policy[os].behavior_protection,
    mode: ProtectionModes.off,
  },
  memory_protection: {
    ...policy[os].memory_protection,
    mode: ProtectionModes.off,
  },
  malware: {
    ...policy[os].malware,
    blocklist: false,
    mode: ProtectionModes.off,
  },
});

const getDisabledCommonPopupsForOS = (
  policy: PolicyConfig,
  os: keyof Omit<PolicyConfig, 'meta'>
) => ({
  behavior_protection: {
    ...policy[os].popup.behavior_protection,
    enabled: false,
  },
  malware: {
    ...policy[os].popup.malware,
    enabled: false,
  },
  memory_protection: {
    ...policy[os].popup.memory_protection,
    enabled: false,
  },
});

const getDisabledWindowsSpecificProtections = (policy: PolicyConfig) => ({
  ransomware: {
    ...policy.windows.ransomware,
    mode: ProtectionModes.off,
  },
  attack_surface_reduction: {
    ...policy.windows.attack_surface_reduction,
    credential_hardening: {
      enabled: false,
    },
  },
});

const getDisabledWindowsSpecificPopups = (policy: PolicyConfig) => ({
  ransomware: {
    ...policy.windows.popup.ransomware,
    enabled: false,
  },
});
