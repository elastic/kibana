/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';

import type { PluginsStart } from '../plugin';
import type { SpacesServiceStart } from '../spaces_service';
import { capabilitiesProvider } from './capabilities_provider';
import { setupCapabilitiesSwitcher } from './capabilities_switcher';

export const setupCapabilities = (
  core: CoreSetup<PluginsStart>,
  getSpacesService: () => SpacesServiceStart,
  logger: Logger
) => {
  core.capabilities.registerProvider(capabilitiesProvider);
  core.capabilities.registerSwitcher(setupCapabilitiesSwitcher(core, getSpacesService, logger));
};
