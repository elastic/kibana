/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmulatorServerPlugin } from '../../lib/emulator_server.types';

export const getCrowdstrikeEmulator = () => {
  const plugin: EmulatorServerPlugin = {
    name: 'crowdstrike',
    register({ router }) {
      router.route({
        path: '/',
        method: 'GET',
        handler: () => {
          return { message: `Live! But not implemented` };
        },
      });
    },
  };

  return plugin;
};
