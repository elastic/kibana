/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { IndexPatternAttributes } from 'src/plugins/data/server';

export class IndexPatternHandler {
  constructor(private savedObjectsClient: SavedObjectsClientContract) {}
  // returns a id based on an index pattern name
  async getIndexPatternId(indexName: string) {
    const response = await this.savedObjectsClient.find<IndexPatternAttributes>({
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
