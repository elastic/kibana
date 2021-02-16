/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger } from 'src/core/server';
import { capabilitiesProvider } from './capabilities_provider';
import { setupCapabilitiesSwitcher } from './capabilities_switcher';
import { PluginsStart } from '../plugin';
import { SpacesServiceStart } from '../spaces_service';

export const setupCapabilities = (
  core: CoreSetup<PluginsStart>,
  getSpacesService: () => SpacesServiceStart,
  logger: Logger
) => {
  core.capabilities.registerProvider(capabilitiesProvider);
  core.capabilities.registerSwitcher(setupCapabilitiesSwitcher(core, getSpacesService, logger));
};
