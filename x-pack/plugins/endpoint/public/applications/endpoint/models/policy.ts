/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyConfig, ProtectionModes } from '../types';

/**
 * Generate a new Policy model.
 * NOTE: in the near future, this will likely be removed and an API call to EPM will be used to retrieve
 * the latest from the Endpoint package
 */
export const generatePolicy = (): PolicyConfig => {
  return {
    windows: {
      events: {
        process: true,
        network: true,
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
        // TODO, is this right?
        file: true,
        // TODO, is this right?
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
        // TODO, is this right?
        file: true,
        // TODO, is this right?
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
