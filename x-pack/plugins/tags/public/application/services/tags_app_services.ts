/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagsServiceContract, TagManager, KidService } from '../../services';

export interface Params {
  readonly tags: TagsServiceContract;
  readonly kid: KidService;
}

export class TagsAppServices {
  public readonly tags: TagsServiceContract;
  public readonly manager: TagManager;
  public readonly kid: KidService;

  constructor(params: Params) {
    this.tags = params.tags;
    this.manager = params.tags.manager!;
    this.kid = params.kid;
  }
}
