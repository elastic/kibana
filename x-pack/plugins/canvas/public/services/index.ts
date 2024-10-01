/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './legacy';
import { useMemo } from 'react';

import { getCustomElementService } from './canvas_custom_element_service';
import { getCanvasExpressionService } from './canvas_expressions_service';
import { getCanvasFiltersService } from './canvas_filters_service';
import { getCanvasNotifyService } from './canvas_notify_service';

export const useCustomElementService = () => {
  const canvasCustomElementService = useMemo(() => getCustomElementService(), []);
  return canvasCustomElementService;
};
export const useExpressionsService = () => {
  const canvasExpressionService = useMemo(() => getCanvasExpressionService(), []);
  return canvasExpressionService;
};
export const useFiltersService = () => {
  const canvasFiltersService = useMemo(() => getCanvasFiltersService(), []);
  return canvasFiltersService;
};
export const useNotifyService = () => {
  const canvasNotifyService = useMemo(() => getCanvasNotifyService(), []);
  return canvasNotifyService;
};

export const useWorkpadService = () => (() => pluginServices.getHooks().workpad.useService())();
