/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewsService } from '../services/kibana_services';
import { getCanvasNotifyService } from '../services/canvas_notify_service';
import { ErrorStrings } from '../../i18n';

export const getDataViews = async () => {
  try {
    return await dataViewsService.getIdsWithTitle();
  } catch (e) {
    const { esService: strings } = ErrorStrings;
    getCanvasNotifyService().error(e, { title: strings.getIndicesFetchErrorMessage() });
  }
  return [];
};

export const getDataViewFields = async (dataViewTitle: string) => {
  const dataView = await dataViewsService.create({ title: dataViewTitle });

  return dataView.fields.filter((field) => !field.name.startsWith('_')).map((field) => field.name);
};
