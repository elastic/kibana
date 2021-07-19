/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from 'src/core/server';

import { ConfigSchema, spacesConfigDeprecationProvider } from './config';
import { SpacesPlugin } from './plugin';

// These exports are part of public Spaces plugin contract, any change in signature of exported
// functions or removal of exports should be considered as a breaking change. Ideally we should
// reduce number of such exports to zero and provide everything we want to expose via Setup/Start
// run-time contracts.

export { addSpaceIdToPath } from '../common';

// end public contract exports

export { SpacesPluginSetup, SpacesPluginStart } from './plugin';
export { SpacesServiceSetup, SpacesServiceStart } from './spaces_service';
export { ISpacesClient, SpacesClientRepositoryFactory, SpacesClientWrapper } from './spaces_client';

export {
  GetAllSpacesOptions,
  GetAllSpacesPurpose,
  GetSpaceResult,
  LegacyUrlAliasTarget,
} from '../common';

// re-export types from oss definition
export type { Space } from 'src/plugins/spaces_oss/common';

export const config: PluginConfigDescriptor = {
  schema: ConfigSchema,
  deprecations: spacesConfigDeprecationProvider,
};
export const plugin = (initializerContext: PluginInitializerContext) =>
  new SpacesPlugin(initializerContext);
