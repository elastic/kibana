/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import type { CanvasStartDeps } from '../../plugin';
import type { DataViewsService } from '../data_views';

export type DataViewsServiceFactory = KibanaPluginServiceFactory<DataViewsService, CanvasStartDeps>;

export const dataViewsServiceFactory: DataViewsServiceFactory = ({ startPlugins }) => ({
  getDefaultDataView: () => startPlugins.dataViews.getDefaultDataView(),
  getIdsWithTitle: () => startPlugins.dataViews.getIdsWithTitle(),
});
