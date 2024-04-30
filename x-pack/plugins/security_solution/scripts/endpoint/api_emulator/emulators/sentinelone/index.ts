/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmulatorServerPlugin } from '../../lib/emulator_server.types';

export const getSentinelOneEmulator = (): EmulatorServerPlugin => {
  const plugin: EmulatorServerPlugin = {
    name: 'sentinelone',
    register({ router }) {
      router.route({
        path: '/activities',
        method: 'GET',
        handler: async (req) => {
          return {
            message: `test: activities from S1. req.app:
${Object.keys(req.app ?? {}).join(' | ')}
req.server.app.services:
${Object.keys(req.server.app.services || {})}

req.pre.services:
${Object.keys(req.pre.services || {})}


`,
          };
        },
      });
    },
  };

  return plugin;
};
