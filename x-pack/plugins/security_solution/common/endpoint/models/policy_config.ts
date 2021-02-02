/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      },
      ransomware: {
        mode: ProtectionModes.prevent,
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
      },
      ransomware: {
        mode: ProtectionModes.prevent,
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
      },
    },
    mac: {
      ...policy.mac,
      ransomware: {
        mode: ProtectionModes.off,
      },
      popup: {
        ...policy.mac.popup,
        malware: {
          message: '',
          enabled: true,
        },
        ransomware: {
          message: '',
          enabled: false,
        },
      },
    },
  };
};

/**
 * Reflects what string the Endpoint will use when message field is default/empty
 */
export const DefaultMalwareMessage = 'Elastic Security {action} {filename}';
