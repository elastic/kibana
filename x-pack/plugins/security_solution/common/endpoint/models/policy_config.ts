/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyConfig, ProtectionModes } from '../types';

/**
 * Return a new default `PolicyConfig`.
 */
export const factory = (): PolicyConfig => {
  return {
    windows: {
      advanced: {
        elasticsearch: {
          tls: {
            verify_hostname: 'false',
            verify_peer: '',
          },
        },
      },
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
      logging: {
        file: 'info',
      },
    },
    mac: {
      advanced: {
        elasticsearch: {
          tls: {
            verify_hostname: '',
            verify_peer: '',
          },
        },
      },
      events: {
        process: true,
        file: true,
        network: true,
      },
      malware: {
        mode: ProtectionModes.prevent,
      },
      logging: {
        file: 'info',
      },
    },
    linux: {
      advanced: {
        elasticsearch: {
          tls: {
            verify_hostname: '',
            verify_peer: '',
          },
        },
      },
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
