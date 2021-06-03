/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/server';
import { StartDeps } from './types';

export const setupCapabilities = (
  core: Pick<CoreSetup<StartDeps>, 'capabilities' | 'getStartServices'>
) => {
  core.capabilities.registerProvider(() => {
    return {
      dataVisualizer: {
        show: true,
      },
    };
  });

  core.capabilities.registerSwitcher(async (request, capabilities, useDefaultCapabilities) => {
    return capabilities;
  });
};
