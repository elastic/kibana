/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsService } from '../../../../../../src/plugins/data_views/common';

export class DataViewHandler {
  constructor(private dataViewService: DataViewsService) {}
  // returns a id based on an index pattern name
  async getDataViewId(indexName: string) {
    const dv = (await this.dataViewService.find(indexName)).find(
      ({ title }) => title === indexName
    );
    return dv?.id;
  }

  async deleteDataViewById(dataViewId: string) {
    return await this.dataViewService.delete(dataViewId);
  }
}
