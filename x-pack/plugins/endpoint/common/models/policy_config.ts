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
        stdout: 'debug',
        file: 'info',
      },
      advanced: {
        elasticsearch: {
          indices: {
            control: 'control-index',
            event: 'event-index',
            logging: 'logging-index',
          },
          kernel: {
            connect: true,
            process: true,
          },
        },
      },
    },
    mac: {
      events: {
        process: true,
        file: true,
        network: true,
      },
      malware: {
        mode: ProtectionModes.detect,
      },
      logging: {
        stdout: 'debug',
        file: 'info',
      },
      advanced: {
        elasticsearch: {
          indices: {
            control: 'control-index',
            event: 'event-index',
            logging: 'logging-index',
          },
          kernel: {
            connect: true,
            process: true,
          },
        },
      },
    },
    linux: {
      events: {
        process: true,
        file: true,
        network: true,
      },
      logging: {
        stdout: 'debug',
        file: 'info',
      },
      advanced: {
        elasticsearch: {
          indices: {
            control: 'control-index',
            event: 'event-index',
            logging: 'logging-index',
          },
          kernel: {
            connect: true,
            process: true,
          },
        },
      },
    },
  };
};
