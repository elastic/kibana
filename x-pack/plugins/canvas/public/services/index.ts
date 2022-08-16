/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './legacy';

import { PluginServices } from '@kbn/presentation-util-plugin/public';

import type { CanvasCustomElementService } from './custom_element';
import type { CanvasEmbeddablesService } from './embeddables';
import type { CanvasExpressionsService } from './expressions';
import type { CanvasFiltersService } from './filters';
import type { CanvasLabsService } from './labs';
import type { CanvasNavLinkService } from './nav_link';
import type { CanvasNotifyService } from './notify';
import type { CanvasPlatformService } from './platform';
import type { CanvasReportingService } from './reporting';
import type { CanvasVisualizationsService } from './visualizations';
import type { CanvasWorkpadService } from './workpad';
import type { DataViewsService } from './data_views';

export interface CanvasPluginServices {
  customElement: CanvasCustomElementService;
  embeddables: CanvasEmbeddablesService;
  expressions: CanvasExpressionsService;
  filters: CanvasFiltersService;
  labs: CanvasLabsService;
  navLink: CanvasNavLinkService;
  notify: CanvasNotifyService;
  platform: CanvasPlatformService;
  reporting: CanvasReportingService;
  visualizations: CanvasVisualizationsService;
  workpad: CanvasWorkpadService;
  dataViews: DataViewsService;
}

export const pluginServices = new PluginServices<CanvasPluginServices>();

export const useCustomElementService = () =>
  (() => pluginServices.getHooks().customElement.useService())();
export const useEmbeddablesService = () =>
  (() => pluginServices.getHooks().embeddables.useService())();
export const useExpressionsService = () =>
  (() => pluginServices.getHooks().expressions.useService())();
export const useFiltersService = () => (() => pluginServices.getHooks().filters.useService())();
export const useLabsService = () => (() => pluginServices.getHooks().labs.useService())();
export const useNavLinkService = () => (() => pluginServices.getHooks().navLink.useService())();
export const useNotifyService = () => (() => pluginServices.getHooks().notify.useService())();
export const usePlatformService = () => (() => pluginServices.getHooks().platform.useService())();
export const useReportingService = () => (() => pluginServices.getHooks().reporting.useService())();
export const useVisualizationsService = () =>
  (() => pluginServices.getHooks().visualizations.useService())();
export const useWorkpadService = () => (() => pluginServices.getHooks().workpad.useService())();
