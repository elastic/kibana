/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagsClient, TagsClientParams } from './tags_client';

export class TagsClientProvider {
  constructor(private readonly initParams: Pick<TagsClientParams, 'logger'>) {}

  public readonly create = (
    remainingParams: Pick<TagsClientParams, 'savedObjectsClient'>
  ): TagsClient => {
    return new TagsClient({ ...this.initParams, ...remainingParams });
  };
}
