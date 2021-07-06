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

import { customElementServiceFactory } from './custom_element';
import { embeddablesServiceFactory } from './embeddables';
import { expressionsServiceFactory } from './expressions';
import { labsServiceFactory } from './labs';
import { navLinkServiceFactory } from './nav_link';
import { notifyServiceFactory } from './notify';
import { platformServiceFactory } from './platform';
import { reportingServiceFactory } from './reporting';
import { searchServiceFactory } from './search';
import { workpadServiceFactory } from './workpad';
import { CanvasPluginServices } from '..';
import { CanvasStartDeps } from '../../plugin';

export { embeddablesServiceFactory } from './embeddables';
export { labsServiceFactory } from './labs';
export { navLinkServiceFactory } from './nav_link';
export { notifyServiceFactory } from './notify';
export { platformServiceFactory } from './platform';
export { reportingServiceFactory } from './reporting';
export { searchServiceFactory } from './search';
export { workpadServiceFactory } from './workpad';

export const pluginServiceProviders: PluginServiceProviders<
  CanvasPluginServices,
  KibanaPluginServiceParams<CanvasStartDeps>
> = {
  customElement: new PluginServiceProvider(customElementServiceFactory),
  embeddables: new PluginServiceProvider(embeddablesServiceFactory),
  expressions: new PluginServiceProvider(expressionsServiceFactory),
  labs: new PluginServiceProvider(labsServiceFactory),
  navLink: new PluginServiceProvider(navLinkServiceFactory),
  notify: new PluginServiceProvider(notifyServiceFactory),
  platform: new PluginServiceProvider(platformServiceFactory),
  reporting: new PluginServiceProvider(reportingServiceFactory),
  search: new PluginServiceProvider(searchServiceFactory),
  workpad: new PluginServiceProvider(workpadServiceFactory),
};

export const pluginServiceRegistry = new PluginServiceRegistry<
  CanvasPluginServices,
  KibanaPluginServiceParams<CanvasStartDeps>
>(pluginServiceProviders);
