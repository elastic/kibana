/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, set } from 'lodash';
import type { PolicyConfig } from '../types';
import { PolicyOperatingSystem, ProtectionModes, AntivirusRegistrationModes } from '../types';

interface PolicyProtectionReference {
  keyPath: string;
  osList: PolicyOperatingSystem[];
  enableValue: unknown;
  disableValue: unknown;
}

const allOsValues = [
  PolicyOperatingSystem.mac,
  PolicyOperatingSystem.linux,
  PolicyOperatingSystem.windows,
];

export const getPolicyProtectionsReference = (): PolicyProtectionReference[] => [
  {
    keyPath: 'malware.mode',
    osList: [...allOsValues],
    disableValue: ProtectionModes.off,
    enableValue: ProtectionModes.prevent,
  },
  {
    keyPath: 'ransomware.mode',
    osList: [PolicyOperatingSystem.windows],
    disableValue: ProtectionModes.off,
    enableValue: ProtectionModes.prevent,
  },
  {
    keyPath: 'memory_protection.mode',
    osList: [...allOsValues],
    disableValue: ProtectionModes.off,
    enableValue: ProtectionModes.prevent,
  },
  {
    keyPath: 'behavior_protection.mode',
    osList: [...allOsValues],
    disableValue: ProtectionModes.off,
    enableValue: ProtectionModes.prevent,
  },
  {
    keyPath: 'attack_surface_reduction.credential_hardening.enabled',
    osList: [PolicyOperatingSystem.windows],
    disableValue: false,
    enableValue: true,
  },
  {
    keyPath: 'antivirus_registration.enabled',
    osList: [PolicyOperatingSystem.windows],
    disableValue: false,
    enableValue: true,
  },
];

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
    const os = item as keyof PolicyConfig as PolicyOperatingSystem;
    if (!allOsValues.includes(os)) {
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
  os: PolicyOperatingSystem
): Partial<PolicyConfig['windows']> => ({
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
    on_write_scan: false,
    mode: ProtectionModes.off,
  },
});

const getDisabledCommonPopupsForOS = (policy: PolicyConfig, os: PolicyOperatingSystem) => ({
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

/**
 * Returns the provided with only event collection turned enabled
 * @param policy
 */
export const ensureOnlyEventCollectionIsAllowed = (policy: PolicyConfig): PolicyConfig => {
  const updatedPolicy = disableProtections(policy);

  set(updatedPolicy, 'windows.antivirus_registration.mode', AntivirusRegistrationModes.disabled);
  set(updatedPolicy, 'windows.antivirus_registration.enabled', false);

  return updatedPolicy;
};

/**
 * Checks to see if the provided policy is set to Event Collection only
 */
export const isPolicySetToEventCollectionOnly = (
  policy: PolicyConfig
): { isOnlyCollectingEvents: boolean; message?: string } => {
  const protectionsRef = getPolicyProtectionsReference();
  let message: string | undefined;

  const hasEnabledProtection = protectionsRef.some(({ keyPath, osList, disableValue }) => {
    return osList.some((osValue) => {
      const fullKeyPathForOs = `${osValue}.${keyPath}`;
      const currentValue = get(policy, fullKeyPathForOs);
      const isEnabled = currentValue !== disableValue;

      if (isEnabled) {
        message = `property [${fullKeyPathForOs}] is set to [${currentValue}]`;
      }

      return isEnabled;
    });
  });

  return {
    isOnlyCollectingEvents: !hasEnabledProtection,
    message,
  };
};

export function isBillablePolicy(policy: PolicyConfig) {
  if (!policy.meta.serverless) return false;

  return !isPolicySetToEventCollectionOnly(policy).isOnlyCollectingEvents;
}
