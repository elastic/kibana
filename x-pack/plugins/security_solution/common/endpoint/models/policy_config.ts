/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PolicyConfig, ProtectionModes } from '../types';

/**
 * Return a new default `PolicyConfig` for platinum and above licenses
 */
export const policyFactory = (): PolicyConfig => {
  return {
    windows: {
      events: {
        dll_and_driver_load: true,
        dns: true,
        file: true,
        network: true,
        process: true,
        registry: true,
        security: true,
      },
      malware: {
        mode: ProtectionModes.prevent,
        blocklist: true,
      },
      ransomware: {
        mode: ProtectionModes.prevent,
        supported: true,
      },
      memory_protection: {
        mode: ProtectionModes.prevent,
        supported: true,
      },
      behavior_protection: {
        mode: ProtectionModes.prevent,
        supported: true,
      },
      popup: {
        malware: {
          message: '',
          enabled: true,
        },
        ransomware: {
          message: '',
          enabled: true,
        },
        memory_protection: {
          message: '',
          enabled: true,
        },
        behavior_protection: {
          message: '',
          enabled: true,
        },
      },
      logging: {
        file: 'info',
      },
      antivirus_registration: {
        enabled: false,
      },
    },
    mac: {
      events: {
        process: true,
        file: true,
        network: true,
      },
      malware: {
        mode: ProtectionModes.prevent,
        blocklist: true,
      },
      behavior_protection: {
        mode: ProtectionModes.prevent,
        supported: true,
      },
      memory_protection: {
        mode: ProtectionModes.prevent,
        supported: true,
      },
      popup: {
        malware: {
          message: '',
          enabled: true,
        },
        behavior_protection: {
          message: '',
          enabled: true,
        },
        memory_protection: {
          message: '',
          enabled: true,
        },
      },
      logging: {
        file: 'info',
      },
    },
    linux: {
      events: {
        process: true,
        file: true,
        network: true,
        session_data: false,
      },
      malware: {
        mode: ProtectionModes.prevent,
        blocklist: true,
      },
      behavior_protection: {
        mode: ProtectionModes.prevent,
        supported: true,
      },
      memory_protection: {
        mode: ProtectionModes.prevent,
        supported: true,
      },
      popup: {
        malware: {
          message: '',
          enabled: true,
        },
        behavior_protection: {
          message: '',
          enabled: true,
        },
        memory_protection: {
          message: '',
          enabled: true,
        },
      },
      logging: {
        file: 'info',
      },
    },
  };
};

/**
 * Strips paid features from an existing or new `PolicyConfig` for gold and below license
 */
export const policyFactoryWithoutPaidFeatures = (
  policy: PolicyConfig = policyFactory()
): PolicyConfig => {
  return {
    ...policy,
    windows: {
      ...policy.windows,
      ransomware: {
        mode: ProtectionModes.off,
        supported: false,
      },
      memory_protection: {
        mode: ProtectionModes.off,
        supported: false,
      },
      behavior_protection: {
        mode: ProtectionModes.off,
        supported: false,
      },
      popup: {
        ...policy.windows.popup,
        malware: {
          message: '',
          enabled: true,
        },
        ransomware: {
          message: '',
          enabled: false,
        },
        memory_protection: {
          message: '',
          enabled: false,
        },
        behavior_protection: {
          message: '',
          enabled: false,
        },
      },
    },
    mac: {
      ...policy.mac,
      behavior_protection: {
        mode: ProtectionModes.off,
        supported: false,
      },
      memory_protection: {
        mode: ProtectionModes.off,
        supported: false,
      },
      popup: {
        ...policy.mac.popup,
        malware: {
          message: '',
          enabled: true,
        },
        memory_protection: {
          message: '',
          enabled: false,
        },
        behavior_protection: {
          message: '',
          enabled: false,
        },
      },
    },
    linux: {
      ...policy.linux,
      behavior_protection: {
        mode: ProtectionModes.off,
        supported: false,
      },
      memory_protection: {
        mode: ProtectionModes.off,
        supported: false,
      },
      popup: {
        ...policy.linux.popup,
        malware: {
          message: '',
          enabled: true,
        },
        memory_protection: {
          message: '',
          enabled: false,
        },
        behavior_protection: {
          message: '',
          enabled: false,
        },
      },
    },
  };
};

/**
 * Strips paid features from an existing or new `PolicyConfig` for gold and below license
 */
export const policyFactoryWithSupportedFeatures = (
  policy: PolicyConfig = policyFactory()
): PolicyConfig => {
  return {
    ...policy,
    windows: {
      ...policy.windows,
      ransomware: {
        ...policy.windows.ransomware,
        supported: true,
      },
      memory_protection: {
        ...policy.windows.memory_protection,
        supported: true,
      },
      behavior_protection: {
        ...policy.windows.behavior_protection,
        supported: true,
      },
    },
    mac: {
      ...policy.mac,
      behavior_protection: {
        ...policy.windows.behavior_protection,
        supported: true,
      },
      memory_protection: {
        ...policy.mac.memory_protection,
        supported: true,
      },
    },
    linux: {
      ...policy.linux,
      behavior_protection: {
        ...policy.windows.behavior_protection,
        supported: true,
      },
      memory_protection: {
        ...policy.linux.memory_protection,
        supported: true,
      },
    },
  };
};

/**
 * Reflects what string the Endpoint will use when message field is default/empty
 */
export const DefaultPolicyNotificationMessage = 'Elastic Security {action} {filename}';
export const DefaultPolicyRuleNotificationMessage = 'Elastic Security {action} {rule}';
