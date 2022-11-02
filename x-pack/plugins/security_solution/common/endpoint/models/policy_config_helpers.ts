/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyConfig, SupportedFields } from '../types';
import { ProtectionModes } from '../types';

/**
 * Returns a copy of the passed `PolicyConfig` with all protections set to disabled.
 *
 * @param policy
 * @param disableSupport Set to true to disable support flags
 * @returns
 */
export const disableProtections = (policy: PolicyConfig, disableSupport = false): PolicyConfig => {
  const supportedField: SupportedFields | {} = disableSupport ? { supported: false } : {};

  const result = disableCommonProtections(policy, supportedField);

  return {
    ...result,
    windows: {
      ...result.windows,
      ...getDisabledWindowsSpecificProtections(result, supportedField),
      popup: {
        ...result.windows.popup,
        ...getDisabledWindowsSpecificPopups(result),
      },
    },
  };
};

const disableCommonProtections = (policy: PolicyConfig, supportedFields: SupportedFields | {}) => {
  let policyOutput = policy;

  for (const key in policyOutput) {
    if (Object.prototype.hasOwnProperty.call(policyOutput, key)) {
      const os = key as keyof PolicyConfig;

      policyOutput = {
        ...policyOutput,
        [os]: {
          ...policyOutput[os],
          ...getDisabledCommonProtectionsForOS(policyOutput, os, supportedFields),
          popup: {
            ...policyOutput[os].popup,
            ...getDisabledCommonPopupsForOS(policyOutput, os),
          },
        },
      };
    }
  }
  return policyOutput;
};

const getDisabledCommonProtectionsForOS = (
  policy: PolicyConfig,
  os: keyof PolicyConfig,
  supportedFields: SupportedFields | {}
) => ({
  behavior_protection: {
    ...policy[os].behavior_protection,
    ...supportedFields,
    mode: ProtectionModes.off,
  },
  memory_protection: {
    ...policy[os].memory_protection,
    ...supportedFields,
    mode: ProtectionModes.off,
  },
  malware: {
    ...policy[os].malware,
    blocklist: false,
    mode: ProtectionModes.off,
  },
});

const getDisabledCommonPopupsForOS = (policy: PolicyConfig, os: keyof PolicyConfig) => ({
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

const getDisabledWindowsSpecificProtections = (
  policy: PolicyConfig,
  supportedField: SupportedFields | {}
) => ({
  ransomware: {
    ...policy.windows.ransomware,
    ...supportedField,
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
