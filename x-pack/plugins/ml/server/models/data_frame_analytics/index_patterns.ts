/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { IIndexPattern } from 'src/plugins/data/server';

export class IndexPatternHandler {
  constructor(private savedObjectsClient: SavedObjectsClientContract) {}
  // returns a id based on an index pattern name
  async getIndexPatternId(indexName: string) {
    const response = await this.savedObjectsClient.find<IIndexPattern>({
      type: 'index-pattern',
      perPage: 10,
      search: `"${indexName}"`,
      searchFields: ['title'],
      fields: ['title'],
    });

    const ip = response.saved_objects.find(
      (obj) => obj.attributes.title.toLowerCase() === indexName.toLowerCase()
    );

    return ip?.id;
  }

  async deleteIndexPatternById(indexId: string) {
    return await this.savedObjectsClient.delete('index-pattern', indexId);
  }
}
