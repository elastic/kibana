/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from '../legacy/stubs';

import {
  PluginServiceProviders,
  PluginServiceProvider,
  PluginServiceRegistry,
} from '../../../../../../src/plugins/presentation_util/public';

import { CanvasPluginServices } from '..';
import { workpadServiceFactory } from './workpad';
import { notifyServiceFactory } from './notify';
import { platformServiceFactory } from './platform';

export { workpadServiceFactory } from './workpad';
export { notifyServiceFactory } from './notify';
export { platformServiceFactory } from './platform';

export const pluginServiceProviders: PluginServiceProviders<CanvasPluginServices> = {
  workpad: new PluginServiceProvider(workpadServiceFactory),
  notify: new PluginServiceProvider(notifyServiceFactory),
  platform: new PluginServiceProvider(platformServiceFactory),
};

export const pluginServiceRegistry = new PluginServiceRegistry<CanvasPluginServices>(
  pluginServiceProviders
);
