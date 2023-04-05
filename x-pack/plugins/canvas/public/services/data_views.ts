/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';

export interface CanvasDataViewsService {
  getFields: (index: string) => Promise<string[]>;
  getDataViews: () => Promise<Array<Pick<DataView, 'id' | 'name' | 'title'>>>;
  getDefaultDataView: () => Promise<Pick<DataView, 'id' | 'name' | 'title'> | undefined>;
}
