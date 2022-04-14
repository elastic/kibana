/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';
import { CanvasDataViewsService } from '../data_views';

type DataViewsServiceFactory = PluginServiceFactory<CanvasDataViewsService>;

export const dataViewsServiceFactory: DataViewsServiceFactory = () => ({
  getDataViews: () => Promise.resolve(['dataview1', 'dataview2']),
  getFields: () => Promise.resolve(['field1', 'field2']),
  getDefaultDataView: () => Promise.resolve('defaultDataView'),
});
