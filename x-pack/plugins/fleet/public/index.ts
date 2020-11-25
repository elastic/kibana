/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext } from 'src/core/public';
import { FleetPlugin } from './plugin';

export { FleetSetup, FleetStart } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new FleetPlugin(initializerContext);
};

export type { NewPackagePolicy } from './applications/fleet/types';
export * from './applications/fleet/types/intra_app_route_state';
export * from './applications/fleet/types/ui_extensions';

export { pagePathGetters } from './applications/fleet/constants';
