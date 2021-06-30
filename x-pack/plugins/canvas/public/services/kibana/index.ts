/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginServiceProviders,
  PluginServiceProvider,
  PluginServiceRegistry,
  KibanaPluginServiceParams,
} from '../../../../../../src/plugins/presentation_util/public';

import { workpadServiceFactory } from './workpad';
import { CanvasPluginServices } from '..';
import { CanvasStartDeps } from '../../plugin';

export { workpadServiceFactory } from './workpad';

export const pluginServiceProviders: PluginServiceProviders<
  CanvasPluginServices,
  KibanaPluginServiceParams<CanvasStartDeps>
> = {
  workpad: new PluginServiceProvider(workpadServiceFactory),
};

export const pluginServiceRegistry = new PluginServiceRegistry<
  CanvasPluginServices,
  KibanaPluginServiceParams<CanvasStartDeps>
>(pluginServiceProviders);
