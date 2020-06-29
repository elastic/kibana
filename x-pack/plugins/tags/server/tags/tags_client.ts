/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObjectsClientContract } from 'src/core/server';

export interface TagsClientParams {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}

export class TagsClient {
  constructor(private readonly params: TagsClientParams) {}
}
