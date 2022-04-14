/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';
import { ErrorStrings } from '../../../i18n';
import { CanvasStartDeps } from '../../plugin';
import { CanvasDataViewsService } from '../data_views';
import { CanvasNotifyService } from '../notify';

const { esService: strings } = ErrorStrings;

export type DataViewsServiceFactory = KibanaPluginServiceFactory<
  CanvasDataViewsService,
  CanvasStartDeps,
  {
    notify: CanvasNotifyService;
  }
>;

export const dataViewsServiceFactory: DataViewsServiceFactory = ({ startPlugins }, { notify }) => ({
  getDataViews: async () => {
    try {
      const dataViews = await startPlugins.data.dataViews.getIdsWithTitle();
      return dataViews.map((view) => view.title);
    } catch (e) {
      notify.error(e, { title: strings.getIndicesFetchErrorMessage() });
    }

    return [];
  },
  getFields: async (dataViewTitle: string) => {
    const dataView = await startPlugins.data.dataViews.create({ title: dataViewTitle });

    return dataView.fields
      .filter((field) => !field.name.startsWith('_'))
      .map((field) => field.name);
  },
  getDefaultDataView: async () => {
    const dataView = await startPlugins.data.dataViews.getDefaultDataView();

    return dataView ? dataView.title : '';
  },
});
