/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import type { DataViewsService } from '../data_views';

type DataViewsFactory = PluginServiceFactory<DataViewsService>;

export const dataViewsServiceFactory: DataViewsFactory = () => ({
  getIdsWithTitle: async () => [{ id: 'id', title: 'kibana_test_data_view' }],
  getDefaultDataView: async () => null,
});
