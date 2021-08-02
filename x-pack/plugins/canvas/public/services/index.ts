/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './legacy';

import { PluginServices } from '../../../../../src/plugins/presentation_util/public';
import { CanvasWorkpadService } from './workpad';
import { CanvasNavLinkService } from './nav_link';
import { CanvasNotifyService } from './notify';
import { CanvasPlatformService } from './platform';

export interface CanvasPluginServices {
  workpad: CanvasWorkpadService;
  notify: CanvasNotifyService;
  platform: CanvasPlatformService;
  navLink: CanvasNavLinkService;
}

export const pluginServices = new PluginServices<CanvasPluginServices>();

export const useWorkpadService = () => (() => pluginServices.getHooks().workpad.useService())();
export const useNavLinkService = () => (() => pluginServices.getHooks().navLink.useService())();
export const useNotifyService = () => (() => pluginServices.getHooks().notify.useService())();
export const usePlatformService = () => (() => pluginServices.getHooks().platform.useService())();
