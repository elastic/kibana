/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
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
    return (await dataViewsContract.find(indexName)).some(({ title }) => title === indexName);
  }
}

export const indexService = new IndexService();
