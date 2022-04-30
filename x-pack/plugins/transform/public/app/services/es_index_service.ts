/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup, SavedObjectsClientContract } from 'kibana/public';
import { API_BASE_PATH } from '../../../common/constants';
import { IIndexPattern } from '../../../../../../src/plugins/data/common';

export class IndexService {
  async canDeleteIndex(http: HttpSetup) {
    const privilege = await http.get<{ hasAllPrivileges: boolean }>(`${API_BASE_PATH}privileges`);
    if (!privilege) {
      return false;
    }
    return privilege.hasAllPrivileges;
  }

  async indexPatternExists(savedObjectsClient: SavedObjectsClientContract, indexName: string) {
    const response = await savedObjectsClient.find<IIndexPattern>({
      type: 'index-pattern',
      perPage: 1,
      search: `"${indexName}"`,
      searchFields: ['title'],
      fields: ['title'],
    });
    const ip = response.savedObjects.find((obj) => obj.attributes.title === indexName);
    return ip !== undefined;
  }
}

export const indexService = new IndexService();
