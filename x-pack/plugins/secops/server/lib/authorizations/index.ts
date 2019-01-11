/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../framework';
export * from './elasticsearch_adapter';
import { AuthorizationsData } from '../../graphql/types';
import { AuthorizationsAdapter, AuthorizationsRequestOptions } from './types';

export class Authorizations {
  constructor(private readonly adapter: AuthorizationsAdapter) {}

  public async getAuthorizations(
    req: FrameworkRequest,
    options: AuthorizationsRequestOptions
  ): Promise<AuthorizationsData> {
    return await this.adapter.getAuthorizations(req, options);
  }
}
