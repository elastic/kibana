/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from '../../../../src/core/server';
import { ConfigSchema } from './config';
import { Plugin } from './plugin';

// These exports are part of public Spaces plugin contract, any change in signature of exported
// functions or removal of exports should be considered as a breaking change. Ideally we should
// reduce number of such exports to zero and provide everything we want to expose via Setup/Start
// run-time contracts.

// end public contract exports

export { SpacesPluginSetup } from './plugin';
export { SpacesServiceSetup } from './spaces_service';
export { Space } from '../common/model/space';

export const config = { schema: ConfigSchema };
export const plugin = (initializerContext: PluginInitializerContext) =>
  new Plugin(initializerContext);
