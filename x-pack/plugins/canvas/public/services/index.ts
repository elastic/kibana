/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './legacy';
import { useCallback, useMemo } from 'react';

import { dataViewsService } from './kibana_services';
import { getCanvasNotifyService } from './canvas_notify_service';
import { ErrorStrings } from '../../i18n';

export const useNotifyService = () => {
  const canvasNotifyService = useMemo(() => getCanvasNotifyService(), []);
  return canvasNotifyService;
};

export const useDataViewsService = () => {
  const getDataViews = useCallback(async () => {
    try {
      return await dataViewsService.getIdsWithTitle();
    } catch (e) {
      const { esService: strings } = ErrorStrings;
      getCanvasNotifyService().error(e, { title: strings.getIndicesFetchErrorMessage() });
    }
    return [];
  }, []);

  const getFields = useCallback(async (dataViewTitle: string) => {
    const dataView = await dataViewsService.create({ title: dataViewTitle });

    return dataView.fields
      .filter((field) => !field.name.startsWith('_'))
      .map((field) => field.name);
  }, []);

  return { getDataViews, getFields };
};
