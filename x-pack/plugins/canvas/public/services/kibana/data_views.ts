/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
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
      const dataViews = await startPlugins.dataViews.getIdsWithTitle();
      return dataViews.map(({ id, name, title }) => ({ id, name, title } as DataView));
    } catch (e) {
      notify.error(e, { title: strings.getIndicesFetchErrorMessage() });
    }

    return [];
  },
  getFields: async (dataViewTitle: string) => {
    const dataView = await startPlugins.dataViews.create({ title: dataViewTitle });

    return dataView.fields
      .filter((field) => !field.name.startsWith('_'))
      .map((field) => field.name);
  },
  getDefaultDataView: async () => {
    const dataView = await startPlugins.dataViews.getDefaultDataView();

    return dataView
      ? { id: dataView.id, name: dataView.name, title: dataView.getIndexPattern() }
      : undefined;
  },
});
