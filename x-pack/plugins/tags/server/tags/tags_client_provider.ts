/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../src/core/server';
import { TagsClient } from './tags_client';

export interface Params {
  logger: Logger;
}

export class TagsClientProvider {
  private constructor(private readonly params: Params) {}

  // Public API ----------------------------------------------------------------

  public create(): TagsClient {
    throw new Error('not implemented');
  }
}
