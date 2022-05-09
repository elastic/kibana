/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';

import { ConfigSchema } from './config';
import { SpacesPlugin } from './plugin';

// These exports are part of public Spaces plugin contract, any change in signature of exported
// functions or removal of exports should be considered as a breaking change. Ideally we should
// reduce number of such exports to zero and provide everything we want to expose via Setup/Start
// run-time contracts.

export { addSpaceIdToPath } from '../common';

// end public contract exports

export type { SpacesPluginSetup, SpacesPluginStart } from './plugin';
export type { SpacesServiceSetup, SpacesServiceStart } from './spaces_service';
export type {
  ISpacesClient,
  SpacesClientRepositoryFactory,
  SpacesClientWrapper,
} from './spaces_client';

export type {
  Space,
  GetAllSpacesOptions,
  GetAllSpacesPurpose,
  GetSpaceResult,
  LegacyUrlAliasTarget,
} from '../common';

export const config: PluginConfigDescriptor = {
  schema: ConfigSchema,
};
export const plugin = (initializerContext: PluginInitializerContext) =>
  new SpacesPlugin(initializerContext);
