/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsSerializer, SavedObjectsSchema } from '../../../../src/core/server';

export interface ISavedObjects {
  create(data: any): Promise<void>;
  search(): Promise<void>;
  delete(): Promise<void>;
}

export function create(server: any): ISavedObjects {
  const schema = new SavedObjectsSchema(SavedObjectSchemas);
  const serializer = new SavedObjectsSerializer(schema);
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const savedObjectsRepository = server.savedObjects.getSavedObjectsRepository(
    callWithInternalUser,
    ['audit_log']
  );

  const options: SavedObjectsOptions = { serializer, savedObjectsRepository };
  return new SavedObjects(options);
}

interface SavedObjectsOptions {
  serializer: SavedObjectsSerializer;
  savedObjectsRepository: SavedObjectsSchema;
}

class SavedObjects implements ISavedObjects {
  constructor(options: SavedObjectsOptions) {}

  async create(data: any) {}

  async search() {
    throw new Error('TBD');
  }

  async delete() {
    throw new Error('TBD');
  }
}

const SavedObjectSchemas = {
  task: {
    hidden: true,
    isNamespaceAgnostic: true,
    convertToAliasScript: `ctx._id = ctx._source.type + ':' + ctx._id`,
    indexPattern(config: any) {
      return config.get('xpack.task_manager.index');
    },
  },
};
