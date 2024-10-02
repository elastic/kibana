/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './legacy';
import { useCallback, useMemo } from 'react';

import { ErrorStrings } from '../../i18n';
import { getCustomElementService } from './canvas_custom_element_service';
import { getCanvasExpressionService } from './canvas_expressions_service';
import { getCanvasFiltersService } from './canvas_filters_service';
import { getCanvasNotifyService } from './canvas_notify_service';
import { getCanvasWorkpadService } from './canvas_workpad_service';
import { dataViewsService } from './kibana_services';

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
export const useWorkpadService = () => {
  const canvasWorkpadService = useMemo(() => getCanvasWorkpadService(), []);
  return canvasWorkpadService;
};
export const useDataViewsService = () => {
  const notifyService = useNotifyService();

  const getDataViews = useCallback(async () => {
    try {
      return await dataViewsService.getIdsWithTitle();
    } catch (e) {
      const { esService: strings } = ErrorStrings;
      notifyService.error(e, { title: strings.getIndicesFetchErrorMessage() });
    }
    return [];
  }, [notifyService]);

  const getFields = useCallback(async (dataViewTitle: string) => {
    const dataView = await dataViewsService.create({ title: dataViewTitle });

    return dataView.fields
      .filter((field) => !field.name.startsWith('_'))
      .map((field) => field.name);
  }, []);

  return { getDataViews, getFields };
};
