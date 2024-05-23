/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalEdrServerEmulatorCoreServices } from '../../external_edr_server_emulator.types';
import type { EmulatorServerPlugin } from '../../lib/emulator_server.types';
import { getCrowdstrikeRouteDefinitions } from './routes';

export const getCrowdstrikeEmulator =
  (): EmulatorServerPlugin<ExternalEdrServerEmulatorCoreServices> => {
    const plugin: EmulatorServerPlugin<ExternalEdrServerEmulatorCoreServices> = {
      name: 'crowdstrike',
      register({ router, expose, services }) {
        router.route(getCrowdstrikeRouteDefinitions());
      },
    };

    return plugin;
  };
