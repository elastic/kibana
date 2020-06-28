/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagsPlugin } from './plugin';
import { PluginInitializerContext } from '../../../../src/core/server';

export const plugin = (initContext: PluginInitializerContext) => new TagsPlugin(initContext);

export {
  TagsPluginSetup,
  TagsPluginStart,
  TagsPluginSetupDependencies,
  TagsPluginStartDependencies,
} from './plugin';
