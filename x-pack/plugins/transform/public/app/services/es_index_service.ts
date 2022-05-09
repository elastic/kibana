/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { API_BASE_PATH } from '../../../common/constants';

export class IndexService {
  async canDeleteIndex(http: HttpSetup) {
    const privilege = await http.get<{ hasAllPrivileges: boolean }>(`${API_BASE_PATH}privileges`);
    if (!privilege) {
      return false;
    }
    return privilege.hasAllPrivileges;
  }

  async dataViewExists(dataViewsContract: DataViewsContract, indexName: string) {
    const dv = (await dataViewsContract.find(indexName)).find(({ title }) => title === indexName);
    return dv !== undefined;
  }
}

export const indexService = new IndexService();
