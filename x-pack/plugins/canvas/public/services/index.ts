/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './legacy';
import { useMemo } from 'react';

import { PluginServices } from '@kbn/presentation-util-plugin/public';

import { CanvasCustomElementService } from './custom_element';
import { getCanvasExpressionService } from './canvas_expressions_service';
import { CanvasFiltersService } from './filters';
import { CanvasNotifyService } from './notify';
import { getCanvasNotifyService } from './canvas_notify_service';
import { getCanvasFiltersService } from './canvas_filters_service';

export interface CanvasPluginServices {
  customElement: CanvasCustomElementService;
  filters: CanvasFiltersService;
  notify: CanvasNotifyService;
  reporting: CanvasReportingService;
}

export const pluginServices = new PluginServices<CanvasPluginServices>();

export const useCustomElementService = () =>
  (() => pluginServices.getHooks().customElement.useService())();

export const useExpressionsService = () => {
  const canvasExpressionService = useMemo(() => getCanvasExpressionService(), []);
  return canvasExpressionService;
};
export const useFiltersService = () => {
  const canvasFiltersService = useMemo(() => getCanvasFiltersService(), []);
  return canvasFiltersService;
};
export const useNotifyService = () => {
  const canvasNotifyService: CanvasNotifyService = useMemo(() => getCanvasNotifyService(), []);
  return canvasNotifyService;
};

export const useWorkpadService = () => (() => pluginServices.getHooks().workpad.useService())();
