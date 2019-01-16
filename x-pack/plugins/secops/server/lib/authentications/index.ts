/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../framework';
export * from './elasticsearch_adapter';
import { AuthenticationsData } from '../../graphql/types';
import { AuthenticationsAdapter, AuthenticationsRequestOptions } from './types';

export class Authentications {
  constructor(private readonly adapter: AuthenticationsAdapter) {}

  public async getAuthentications(
    req: FrameworkRequest,
    options: AuthenticationsRequestOptions
  ): Promise<AuthenticationsData> {
    return await this.adapter.getAuthentications(req, options);
  }
}
