/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EmulatorServerPlugin,
  EmulatorServerRouteHandlerMethod,
} from '../../lib/emulator_server.types';

export const getSentinelOneEmulator = (): EmulatorServerPlugin => {
  const plugin: EmulatorServerPlugin = {
    name: 'sentinelone',
    register({ router }) {
      router.route({
        path: '/activities',
        method: 'GET',
        handler: sentinelOneActivityApiHandler,
      });
    },
  };

  return plugin;
};

const sentinelOneActivityApiHandler: EmulatorServerRouteHandlerMethod<
  {},
  {},
  {},
  { services: { foo: 'hello' } }
> = async (req, h) => {
  return {
    message: `test: activities from S1`,
    preServices: Object.keys(req.pre.services || {}),
  };
};
