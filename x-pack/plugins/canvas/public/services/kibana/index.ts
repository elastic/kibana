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

import { CanvasPluginServices } from '..';
import { CanvasStartDeps } from '../../plugin';
import { embeddablesServiceFactory } from './embeddables';
import { expressionsServiceFactory } from './expressions';
import { navLinkServiceFactory } from './nav_link';
import { notifyServiceFactory } from './notify';
import { platformServiceFactory } from './platform';
import { reportingServiceFactory } from './reporting';
import { workpadServiceFactory } from './workpad';

export { expressionsServiceFactory } from './expressions';
export { embeddablesServiceFactory } from './embeddables';
export { notifyServiceFactory } from './notify';
export { platformServiceFactory } from './platform';
export { reportingServiceFactory } from './reporting';
export { workpadServiceFactory } from './workpad';

export const pluginServiceProviders: PluginServiceProviders<
  CanvasPluginServices,
  KibanaPluginServiceParams<CanvasStartDeps>
> = {
  expressions: new PluginServiceProvider(expressionsServiceFactory),
  navLink: new PluginServiceProvider(navLinkServiceFactory),
  embeddables: new PluginServiceProvider(embeddablesServiceFactory),
  notify: new PluginServiceProvider(notifyServiceFactory),
  platform: new PluginServiceProvider(platformServiceFactory),
  reporting: new PluginServiceProvider(reportingServiceFactory),
  workpad: new PluginServiceProvider(workpadServiceFactory),
};

export const pluginServiceRegistry = new PluginServiceRegistry<
  CanvasPluginServices,
  KibanaPluginServiceParams<CanvasStartDeps>
>(pluginServiceProviders);
