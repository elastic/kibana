/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, SavedObjectsClientContract } from 'kibana/server';
import { IndexPatternAttributes } from 'src/plugins/data/server';
// import { findObjectByTitle } from 'src/plugins/saved_objects/';
import { mlLog } from '../../client/log';
export const SAVED_OBJECT_TYPES = {
  DASHBOARD: 'dashboard',
  SEARCH: 'search',
  VISUALIZATION: 'visualization',
};

export class IndexPatternHandler {
  modulesDir = `${__dirname}/modules`;
  indexPatternName: string = '';
  indexPatternId: string | undefined = undefined;

  constructor(
    private callAsCurrentUser: APICaller,
    private savedObjectsClient: SavedObjectsClientContract
  ) {}
  // returns a id based on an index pattern name
  async getIndexPatternId(indexName: string) {
    try {
      const response = await this.savedObjectsClient.find<IndexPatternAttributes>({
        type: 'index-pattern',
        perPage: 10,
        search: `"${indexName}"`,
        searchFields: ['title'],
        fields: ['title'],
      });

      const ip = response.saved_objects.find(
        obj => obj.attributes.title.toLowerCase() === indexName.toLowerCase()
      );

      return ip !== undefined ? ip.id : undefined;
    } catch (error) {
      mlLog.warn(`Error loading index patterns, ${error}`);
      return;
    }
  }

  async deleteIndexPatternById(indexId: string) {
    return await this.savedObjectsClient.delete('index-pattern', indexId);
  }
}
