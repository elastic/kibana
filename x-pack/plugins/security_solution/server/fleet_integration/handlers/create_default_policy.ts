/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  policyFactory as policyConfigFactory,
  policyFactoryWithoutPaidFeatures as policyConfigFactoryWithoutPaidFeatures,
} from '../../../common/endpoint/models/policy_config';
import type { LicenseService } from '../../../common/license/license';
import { isAtLeast } from '../../../common/license/license';
import { ProtectionModes } from '../../../common/endpoint/types';
import type { PolicyConfig } from '../../../common/endpoint/types';
import type { AnyPolicyCreateConfig, PolicyCreateEndpointConfig } from '../types';
import { ENDPOINT_CONFIG_PRESET_EDR_ESSENTIAL, ENDPOINT_CONFIG_PRESET_NGAV } from '../constants';

/**
 * Create the default endpoint policy based on the current license and configuration type
 */
export const createDefaultPolicy = (
  licenseService: LicenseService,
  config: AnyPolicyCreateConfig | undefined
): PolicyConfig => {
  const policy = isAtLeast(licenseService.getLicenseInformation(), 'platinum')
    ? policyConfigFactory()
    : policyConfigFactoryWithoutPaidFeatures();

  if (config?.type === 'cloud') {
    return getCloudPolicyConfig(policy);
  }

  return getEndpointPolicyWithIntegrationConfig(policy, config);
};

/**
 * Set all keys of the given object to false
 */
const falsyObjectKeys = <T extends Record<string, boolean>>(obj: T): T => {
  return Object.keys(obj).reduce((accumulator, key) => {
    return { ...accumulator, [key]: false };
  }, {} as T);
};

/**
 * Retrieve policy for endpoint based on the preset selected in the endpoint integration config
 */
const getEndpointPolicyWithIntegrationConfig = (
  policy: PolicyConfig,
  config: PolicyCreateEndpointConfig | undefined
): PolicyConfig => {
  const isEDREssential = config?.endpointConfig?.preset === ENDPOINT_CONFIG_PRESET_EDR_ESSENTIAL;

  if (config?.endpointConfig?.preset === ENDPOINT_CONFIG_PRESET_NGAV || isEDREssential) {
    const events = {
      process: true,
      file: isEDREssential,
      network: isEDREssential,
    };

    return {
      ...policy,
      linux: {
        ...policy.linux,
        events: {
          ...falsyObjectKeys(policy.linux.events),
          ...events,
        },
      },
      windows: {
        ...policy.windows,
        events: {
          ...falsyObjectKeys(policy.windows.events),
          ...events,
        },
      },
      mac: {
        ...policy.mac,
        events: {
          ...falsyObjectKeys(policy.mac.events),
          ...events,
        },
      },
    };
  }

  return policy;
};

/**
 * Retrieve policy for cloud based on the on the cloud integration config
 */
const getCloudPolicyConfig = (policy: PolicyConfig): PolicyConfig => {
  // Disabling all protections, since it's not yet supported on Cloud integrations
  const protections = {
    memory_protection: {
      supported: false,
      mode: ProtectionModes.off,
    },
    malware: {
      ...policy.linux.malware,
      mode: ProtectionModes.off,
    },
    behavior_protection: {
      ...policy.linux.behavior_protection,
      mode: ProtectionModes.off,
    },
  };

  return {
    ...policy,
    linux: {
      ...policy.linux,
      ...protections,
      events: {
        ...policy.linux.events,
        session_data: true,
      },
    },
    windows: {
      ...policy.windows,
      ...protections,
      // Disabling ransomware protection, since it's not supported on Cloud integrations
      ransomware: {
        supported: false,
        mode: ProtectionModes.off,
      },
    },
    mac: {
      ...policy.mac,
      ...protections,
    },
  };
};
